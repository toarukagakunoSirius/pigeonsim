
load = (opts, callback) ->
  url = opts.url
  opts.method ?= 'GET'
  if opts.search?
    kvps = ("#{escape(k)}=#{escape(v)}" for own k, v of opts.search)
    url += '?' + kvps.join('&')
  xhr = new XMLHttpRequest()
  xhr.onreadystatechange = ->
    if xhr.readyState is 4
      obj = if opts.json? then JSON.parse(xhr.responseText)
      else if opts.xml? then xhr.responseXML
      else xhr.responseText
      callback(obj)
  xhr.open(opts.method, url, yes)
  xhr.send(opts.data)

mergeObj = (o1, o2) ->
  (o1[k] = v) for own k, v of o2
  o1

oneEightyOverPi = 180 / Math.PI
box = null

class @FeatureManager
  constructor: (@ge, @lonRatio) ->
    @featureTree = new RTree()
    @visibleFeatures = {}
    @updateMoment = 0
    
  addFeature: (f) ->
    @featureTree.insert(f.rect(), f)
    
  removeFeature: (f) ->
    @hideFeature(f)
    @featureTree.remove(f.rect(), f)
  
  showFeature: (f, cam) ->
    return no if @visibleFeatures[f.id]?
    @visibleFeatures[f.id] = f
    f.show(@ge, cam)
    return yes
  
  hideFeature: (f) ->
    return no unless @visibleFeatures[f.id]?
    delete @visibleFeatures[f.id]
    f.hide(@ge)
    return yes
  
  featuresInBBox: (lat1, lon1, lat2, lon2) ->  # ones must be SW of (i.e. lower than) twos
    @featureTree.search({x: lon1, y: lat1, w: lon2 - lon1, h: lat2 - lat1})
    
  update: (cam) ->
    lookAt = @ge.getView().copyAsLookAt(ge.ALTITUDE_ABSOLUTE)
    lookLat = lookAt.getLatitude()
    lookLon = lookAt.getLongitude()
    midLat = (cam.lat + lookLat) / 2
    midLon = (cam.lon + lookLon) / 2
    
    latDiff = Math.abs(cam.lat - midLat)
    lonDiff = Math.abs(cam.lon - midLon)
    
    if latDiff > lonDiff * @lonRatio
      latSize = latDiff
      lonSize = latDiff * @lonRatio
    else
      lonSize = lonDiff
      latSize = lonDiff / @lonRatio

    sizeFactor = 1.1  # 1 = a box with the camera and lookAt points on its borders
    latSize *= sizeFactor
    lonSize *= sizeFactor

    lat1 = midLat - latSize
    lat2 = midLat + latSize
    lon1 = midLon - lonSize
    lon2 = midLon + lonSize
    
    ###
    ge.getFeatures().removeChild(box) if box
    kml = "<?xml version='1.0' encoding='UTF-8'?><kml xmlns='http://www.opengis.net/kml/2.2'><Document><Placemark><name>lookAt</name><Point><coordinates>#{lookLon},#{lookLat},0</coordinates></Point></Placemark><Placemark><name>camera</name><Point><coordinates>#{cam.lon},#{cam.lat},0</coordinates></Point></Placemark><Placemark><name>middle</name><Point><coordinates>#{midLon},#{midLat},0</coordinates></Point></Placemark><Placemark><LineString><altitudeMode>absolute</altitudeMode><coordinates>#{lon1},#{lat1},100 #{lon1},#{lat2},100 #{lon2},#{lat2},100 #{lon2},#{lat1},50 #{lon1},#{lat1},100</coordinates></LineString></Placemark></Document></kml>"
    box = ge.parseKml(kml)
    ge.getFeatures().appendChild(box)
    #console.log(kml)
    ###
    
    for f in @featuresInBBox(lat1, lon1, lat2, lon2)
      @showFeature(f, cam)
      f.updateMoment = @updateMoment
    
    for own id, f of @visibleFeatures
      @hideFeature(f) if f.updateMoment < @updateMoment
    
    @updateMoment += 1

class @FeatureSet
  constructor: (@featureManager) ->
    @features = {}
  
  addFeature: (f) ->
    @features[f.id] = f
    @featureManager.addFeature(f)
    
  removeFeature: () ->
    @featureManager.removeFeature(f)
    delete @features[f.id]
  
  clearFeatures: -> @removeFeature(f) for own f of @features

    
class this.Feature
  alt: 100
  nameTextOpts: {}
  descTextOpts: {}
  
  constructor: (@id, @lat, @lon) ->
  
  rect: -> {x: @lon, y: @lat, w: 0, h: 0}
    
  show: (ge, cam) ->
    angleToCamRad = Math.atan2(@lon - cam.lon, @lat - cam.lat)
    angleToCamDeg = angleToCamRad * oneEightyOverPi
    st = new SkyText(@lat, @lon, @alt)
    st.text(@name, mergeObj({bearing: angleToCamDeg}, @nameTextOpts)) if @name
    st.text(@desc, mergeObj({bearing: angleToCamDeg}, @descTextOpts)) if @desc
    @geNode = ge.parseKml(st.kml())
    ge.getFeatures().appendChild(@geNode)
    
  hide: (ge) ->
    if @geNode
      ge.getFeatures().removeChild(@geNode)
      delete @geNode


class @TubeStation extends Feature
  alt: 120
  
class @RailStation extends Feature
  alt: 180
  nameTextOpts: {size: 3}
  
class @CASALogo extends Feature
  alt: 200
  nameTextOpts: {size: 1}

class @Tweet extends Feature
  alt: 240
  nameTextOpts: {size: 1, lineWidth: 3}
  descTextOpts: {size: 1}

class @RailStationSet extends FeatureSet
  constructor: (featureManager) ->
    super(featureManager)
    for row in @csv.split("\n")
      [code, name, lat, lon] = row.split(',')
      station = new RailStation("rail-#{code}", parseFloat(lat), parseFloat(lon))
      station.name = "\uF001 #{name}"
      @addFeature(station)

class @TubeStationSet extends FeatureSet
  constructor: (featureManager) ->
    super(featureManager)
    for row in @csv.split("\n")
      [code, dummy, lon, lat, name] = row.split(',')
      station = new TubeStation("tube-#{code}", parseFloat(lat), parseFloat(lon))
      station.name = "\uF000 #{name}"
      @addFeature(station)

class @CASALogoSet extends FeatureSet
  constructor: (featureManager) ->
    super(featureManager)
    logo = new CASALogo("casa-logo", 51.52192375643773, -0.13593167066574097)
    logo.name = "\uF002"
    @addFeature(logo)

class @LondonTweetSet extends FeatureSet
  lineChars = 35
  
  constructor: (featureManager) ->
    super(featureManager)
    @update()
      
  update: ->
    load {url: 'http://128.40.47.96/~sjg/LondonTwitterStream/', json: yes}, (data) =>
      tweets = data.results
      @clearFeatures()
      @features = for t in tweets
        tweet = new Tweet("tweet-#{t.twitterID}", parseFloat(t.lat), parseFloat(t.lon))
        tweet.name = '@' + t.name
        tweet.desc = t.twitterPost.match(/.{1,35}(\s|$)|\S+?(\s|$)/g).join('\n')
        @addFeature(tweet)
    
