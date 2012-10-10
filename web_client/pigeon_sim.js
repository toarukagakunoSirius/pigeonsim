(function() {
  var __hasProp = Object.prototype.hasOwnProperty, __slice = Array.prototype.slice, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  google.setOnLoadCallback(function() {
    var addLayers, altStatus, animTick, animTicks, animTimeout, cam, camMoves, compassPts, connect, debugDataStatus, debugEarthAPIStatus, debugTicksStatus, earthInitCallback, el, els, features, flapAmount, flown, fm, ge, headingStatus, id, inMsgs, k, kvp, lastFlap, lastMove, latFactor, lonFactor, lonRatio, moveCam, objClone, objsEq, params, pi, piOver180, resetCam, seenCam, speed, titleStatus, truncNum, twoPi, updateCam, v, w, wrapDegs180, wrapDegs360, _i, _len, _ref, _ref2, _ref3;
    if (!window.WebSocket) {
      alert('This app needs browser WebSocket support');
      return;
    }
    el = function(id) {
      return document.getElementById(id);
    };
    els = function(sel) {
      return document.querySelectorAll(sel);
    };
    w = function(s) {
      return s.split(/\s+/);
    };
    objsEq = function(o1, o2) {
      var k, v;
      if (o2 == null) o2 = {};
      for (k in o1) {
        if (!__hasProp.call(o1, k)) continue;
        v = o1[k];
        if (o2[k] !== v) return false;
      }
      return true;
    };
    objClone = function(o1, o2) {
      var k, v;
      if (o2 == null) o2 = {};
      for (k in o1) {
        if (!__hasProp.call(o1, k)) continue;
        v = o1[k];
        o2[k] = v;
      }
      return o2;
    };
    truncNum = function(n, dp) {
      if (dp == null) dp = 2;
      if (typeof n === 'number') {
        return parseFloat(n.toFixed(dp));
      } else {
        return n;
      }
    };
    wrapDegs360 = function(d) {
      while (d < 0) {
        d += 360;
      }
      while (d >= 360) {
        d -= 360;
      }
      return d;
    };
    wrapDegs180 = function(d) {
      while (d < -180) {
        d += 360;
      }
      while (d >= 180) {
        d -= 360;
      }
      return d;
    };
    params = {
      startLat: 51.5035,
      startLon: -0.0742,
      startHeading: 302,
      city: "London",
      startAlt: 80,
      minAlt: 5,
      maxAlt: 400,
      speed: 4,
      maxSpeed: 5,
      cruiseTilt: 87,
      diveSpeed: 0.15,
      diveAccel: 0.05,
      diveDecel: 0.1,
      flapSize: 1,
      flapDecay: 0.8,
      maxRoll: 80,
      turnSpeed: 0.075,
      status: 1,
      debugData: 0,
      atmosphere: 1,
      sun: 0,
      timeControl: 0,
      resetTimeout: 60,
      featureSkip: 12,
      debugBox: 0,
      reconnectWait: 2,
      ws: 'ws://127.0.0.1:8888/p5websocket',
      features: 'air,rail,traffic,tide,twitter,olympics,misc'
    };
    _ref = window.location.search.substring(1).split('&');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      kvp = _ref[_i];
      _ref2 = kvp.split('='), k = _ref2[0], v = _ref2[1];
      params[k] = k === 'ws' || k === 'features' || k === 'city' ? v : parseFloat(v);
    }
    if (params.city === "leeds") {
      params.startLat = 53.79852807423503;
      params.startLon = -1.5497589111328125;
      params.startHeading = 12;
      params.startAlt = 100;
      params.speed = 3;
      params.features += ',leeds';
    } else if (params.city === "london") {
      params.startLat = 51.5035;
      params.startLon = -0.0742;
      params.startHeading = 302;
      params.startAlt = 80;
    }
    features = params.features.split(',');
    if (params.status) el('statusOuter').style.display = 'block';
    if (params.debugData) el('credit').style.display = 'none';
    _ref3 = (function() {
      var _j, _len2, _ref3, _results;
      _ref3 = w('title alt debugData debugEarthAPI debugTicks heading');
      _results = [];
      for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
        id = _ref3[_j];
        _results.push(el(id));
      }
      return _results;
    })(), titleStatus = _ref3[0], altStatus = _ref3[1], debugDataStatus = _ref3[2], debugEarthAPIStatus = _ref3[3], debugTicksStatus = _ref3[4], headingStatus = _ref3[5];
    window.cam = cam = {};
    ge = seenCam = flown = animTimeout = fm = lastMove = null;
    animTicks = camMoves = inMsgs = 0;
    lastFlap = flapAmount = 0;
    pi = Math.PI;
    twoPi = pi * 2;
    piOver180 = pi / 180;
    compassPts = w('N NE E SE S SW W NW N');
    speed = params.speed;
    latFactor = 0.00001;
    lonRatio = 1 / Math.cos(params.startLat * piOver180);
    lonFactor = latFactor * lonRatio;
    resetCam = function() {
      cam.lat = params.startLat;
      cam.lon = params.startLon;
      cam.heading = params.startHeading;
      cam.alt = params.startAlt;
      cam.roll = 0.0000001;
      cam.tilt = params.cruiseTilt;
      lastMove = new Date();
      return flown = false;
    };
    moveCam = function() {
      var c, unmoved, view;
      camMoves += 1;
      if (params.debugData) debugEarthAPIStatus.innerHTML = camMoves;
      unmoved = objsEq(cam, seenCam);
      if (unmoved) return false;
      lastMove = new Date();
      view = ge.getView();
      c = view.copyAsCamera(ge.ALTITUDE_ABSOLUTE);
      c.setLatitude(cam.lat);
      c.setLongitude(cam.lon);
      c.setAltitude(cam.alt);
      c.setHeading(cam.heading);
      c.setTilt(cam.tilt);
      c.setRoll(cam.roll);
      view.setAbstractView(c);
      seenCam = objClone(cam);
      if (params.debugData) {
        debugEarthAPIStatus.innerHTML += ' ' + JSON.stringify(cam, function(k, v) {
          return truncNum(v);
        });
      }
      return true;
    };
    addLayers = function() {
      var l, layers, _j, _len2, _results;
      layers = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      _results = [];
      for (_j = 0, _len2 = layers.length; _j < _len2; _j++) {
        l = layers[_j];
        _results.push(ge.getLayerRoot().enableLayerById(l, true));
      }
      return _results;
    };
    updateCam = function(data) {
      var alt, altDelta, flapDiff, heading, headingDelta, headingRad, latDelta, lonDelta, roll;
      if (flown && data.reset === 1) {
        resetCam();
        fm.reset();
      }
      if (data.reset === 2) window.location.reload();
      if (data.roll == null) return;
      flown = true;
      altDelta = 0;
      if (data.dive > 0) {
        altDelta = -data.dive * params.diveSpeed * speed;
        speed += data.dive * params.diveAccel;
        if (speed > params.maxSpeed) speed = params.maxSpeed;
      } else {
        speed -= params.diveDecel;
        if (speed < params.speed) speed = params.speed;
      }
      flapDiff = data.flap - lastFlap;
      if (flapDiff > 0) flapAmount += params.flapSize * flapDiff;
      if (flapAmount > 0) altDelta += flapAmount;
      flapAmount *= params.flapDecay;
      lastFlap = data.flap;
      roll = data.roll;
      if (roll > params.maxRoll) roll = params.maxRoll;
      if (roll < -params.maxRoll) roll = -params.maxRoll;
      headingDelta = -roll * params.turnSpeed;
      heading = wrapDegs360(cam.heading + headingDelta);
      headingRad = heading * piOver180;
      latDelta = Math.cos(headingRad) * speed * latFactor;
      lonDelta = Math.sin(headingRad) * speed * lonFactor;
      alt = cam.alt + altDelta;
      if (alt < params.minAlt) alt = params.minAlt;
      if (alt > params.maxAlt) alt = params.maxAlt;
      cam.lat += latDelta;
      cam.lon += lonDelta;
      cam.heading = heading;
      cam.alt = alt;
      cam.roll = roll;
      return cam.tilt = params.cruiseTilt - data.dive;
    };
    animTick = function() {
      var moved;
      if (params.debugData) debugTicksStatus.innerHTML = animTicks;
      headingStatus.innerHTML = compassPts[Math.round(wrapDegs360(cam.heading) / 45)];
      altStatus.innerHTML = "" + (Math.round(cam.alt)) + "m";
      moved = moveCam();
      if (animTicks % params.featureSkip === 0) {
        if (flown && new Date() - lastMove > params.resetTimeout * 1000) {
          resetCam();
          fm.reset();
        } else {
          fm.update();
        }
      }
      if (animTimeout != null) clearTimeout(animTimeout);
      animTimeout = null;
      if (!moved) animTimeout = setTimeout(animTick, 200);
      return animTicks += 1;
    };
    connect = function() {
      var ws;
      ws = new WebSocket(params.ws);
      titleStatus.style.color = '#ff0';
      ws.onopen = function() {
        titleStatus.style.color = '#fff';
        return ge.getNavigationControl().setVisibility(ge.VISIBILITY_HIDE);
      };
      ws.onclose = function() {
        titleStatus.style.color = '#f00';
        setTimeout(connect, params.reconnectWait * 1000);
        return ge.getNavigationControl().setVisibility(ge.VISIBILITY_AUTO);
      };
      return ws.onmessage = function(e) {
        var data;
        inMsgs += 1;
        data = JSON.parse(e.data);
        if (params.debugData) {
          debugDataStatus.innerHTML = "" + inMsgs + " " + (JSON.stringify(data, function(k, v) {
            return truncNum(v);
          }));
        }
        return updateCam(data);
      };
    };
    earthInitCallback = function(instance) {
      var ccs, las, lds, lts, ovs, rss, tgs, trs, tss;
      window.ge = ge = instance;
      console.log("Google Earth plugin v" + (ge.getPluginVersion()) + ", API v" + (ge.getApiVersion()));
      addLayers(ge.LAYER_TERRAIN, ge.LAYER_TREES, ge.LAYER_BUILDINGS, ge.LAYER_BUILDINGS_LOW_RESOLUTION);
      ge.getOptions().setAtmosphereVisibility(params.atmosphere);
      ge.getSun().setVisibility(params.sun);
      ge.getTime().getControl().setVisibility(params.timeControl ? ge.VISIBILITY_SHOW : ge.VISIBILITY_HIDE);
      ge.getOptions().setFlyToSpeed(ge.SPEED_TELEPORT);
      resetCam();
      ge.getWindow().setVisibility(true);
      fm = new FeatureManager(ge, lonRatio, cam, params);
      if (__indexOf.call(features, 'air') >= 0) las = new LondonAirSet(fm);
      if (__indexOf.call(features, 'tube') >= 0) tss = new TubeStationSet(fm);
      if (__indexOf.call(features, 'rail') >= 0) rss = new RailStationSet(fm);
      if (__indexOf.call(features, 'traffic') >= 0) trs = new LondonTrafficSet(fm);
      if (__indexOf.call(features, 'tide') >= 0) tgs = new TideGaugeSet(fm);
      if (__indexOf.call(features, 'misc') >= 0) ccs = new MiscSet(fm);
      if (__indexOf.call(features, 'twitter') >= 0) lts = new LondonTweetSet(fm);
      if (__indexOf.call(features, 'olympics') >= 0 && new Date("2012-08-12") - new Date() > 0) {
        ovs = new OlympicSet(fm);
      }
      if (__indexOf.call(features, 'leeds') >= 0) lds = new LeedsCitySet(fm);
      google.earth.addEventListener(ge, 'frameend', animTick);
      animTick();
      return connect();
    };
    return google.earth.createInstance('earth', earthInitCallback, function() {
      return console.log("Google Earth error: " + errorCode);
    });
  });

  google.load('earth', '1', {
    'other_params': 'sensor=false'
  });

}).call(this);
