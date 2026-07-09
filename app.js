
const cities = [
  { name: 'Karachi, Pakistan', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore, Pakistan', lat: 31.5204, lon: 74.3587 },
  { name: 'Islamabad, Pakistan', lat: 33.6844, lon: 73.0479 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
  { name: 'Los Angeles, USA', lat: 34.0522, lon: -118.2437 },
  { name: 'San Francisco, USA', lat: 37.7749, lon: -122.4194 },
  { name: 'Chicago, USA', lat: 41.8781, lon: -87.6298 },
  { name: 'Miami, USA', lat: 25.7617, lon: -80.1918 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
  { name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi, India', lat: 28.7041, lon: 77.1025 },
  { name: 'Shanghai, China', lat: 31.2304, lon: 121.4737 },
  { name: 'Beijing, China', lat: 39.9042, lon: 116.4074 },
  { name: 'Moscow, Russia', lat: 55.7558, lon: 37.6173 },
  { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357 },
  { name: 'Istanbul, Turkey', lat: 41.0082, lon: 28.9784 },
  { name: 'Bangkok, Thailand', lat: 13.7563, lon: 100.5018 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Toronto, Canada', lat: 43.6532, lon: -79.3832 },
  { name: 'Mexico City, Mexico', lat: 19.4326, lon: -99.1332 },
  { name: 'Rio de Janeiro, Brazil', lat: -22.9068, lon: -43.1729 },
  { name: 'Cape Town, South Africa', lat: -33.9249, lon: 18.4241 },
  { name: 'Barcelona, Spain', lat: 41.3874, lon: 2.1686 },
  { name: 'Rome, Italy', lat: 41.9028, lon: 12.4964 },
  { name: 'Berlin, Germany', lat: 52.5200, lon: 13.4050 },
];
function getCity(name) { return cities.find(c => c.name === name); }

const originSelect = document.getElementById('origin');
const destSelect = document.getElementById('destination');
const flyBtn = document.getElementById('flyBtn');
const statusEl = document.getElementById('status');

cities.forEach(c => {
  originSelect.add(new Option(c.name, c.name));
  destSelect.add(new Option(c.name, c.name));
});
originSelect.value = 'Karachi, Pakistan';
destSelect.value = 'New York, USA';

originSelect.addEventListener('change', function() {
  if (this.value === destSelect.value) {
    for (let opt of destSelect.options) {
      if (opt.value !== this.value) { destSelect.value = opt.value; break; }
    }
  }
});
destSelect.addEventListener('change', function() {
  if (this.value === originSelect.value) {
    for (let opt of originSelect.options) {
      if (opt.value !== this.value) { originSelect.value = opt.value; break; }
    }
  }
});

statusEl.textContent = 'Loading globe...';

(function initCesium() {
  if (typeof Cesium === 'undefined') {
    statusEl.textContent = 'Error: CesiumJS failed to load';
    return;
  }

  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3OGVkODdiOS1mMDllLTRjNTUtYWZlOC03NTM4ZDBlN2JlODQiLCJpZCI6NDU0NTU0LCJzdWIiOiJUYWxoYTEyMyIsImlzcyI6Imh0dHBzOi8vYXBpLmNlc2l1bS5jb20iLCJhdWQiOiJIYW56YWxhIiwiaWF0IjoxNzgzNjE1OTI1fQ.cs_9XZ-k9Hwt32vB8XYX0byiqIRHZ7rYwEEeFiXiuSY';

  const viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false, timeline: false, infoBox: false, selectionIndicator: false,
    fullscreenButton: false, baseLayerPicker: false, homeButton: false,
    navigationHelpButton: false, sceneModePicker: false
  });

  let flightActive = false;
  let osmTileset = null;

  async function loadOsmBuildings() {
    if (osmTileset) { viewer.scene.primitives.remove(osmTileset); osmTileset = null; }
    try {
      osmTileset = await Cesium.createOsmBuildingsAsync();
      viewer.scene.primitives.add(osmTileset);
      return true;
    } catch (e) { return false; }
  }

  function computePath(slat, slon, elat, elon, h1, h2, n) {
    const s = Cesium.Cartographic.fromDegrees(slon, slat);
    const e = Cesium.Cartographic.fromDegrees(elon, elat);
    const g = new Cesium.EllipsoidGeodesic(s, e);
    const p = [];
    for (let i = 0; i <= n; i++) {
      const frac = i / n;
      const c = g.interpolateUsingFraction(frac);
      c.height = h1 + (h2 - h1) * frac;
      p.push(Cesium.Cartographic.toCartesian(c));
    }
    return p;
  }

  async function startFlight(originCity, destCity) {
    flightActive = true;
    flyBtn.disabled = true;
    flyBtn.textContent = 'Flying...';
    viewer.entities.removeAll();

    statusEl.textContent = `${originCity.name} -> ${destCity.name}`;

    const H1 = 100000, H2 = 300, N = 150, D = 5;
    const positions = computePath(originCity.lat, originCity.lon, destCity.lat, destCity.lon, H1, H2, N);



    // Origin & Dest markers
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(originCity.lon, originCity.lat, 0),
      billboard: { image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2344ff44" width="28" height="28"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, scale: 1.5 },
      label: { text: originCity.name, font: '16px Segoe UI', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, -35) }
    });
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(destCity.lon, destCity.lat, 0),
      billboard: { image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff4444" width="28" height="28"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, scale: 1.5 },
      label: { text: destCity.name, font: '16px Segoe UI', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, -35) }
    });

    const st = Cesium.JulianDate.now();
    const et = Cesium.JulianDate.addSeconds(st, D, new Cesium.JulianDate());

    // Set clock to match flight times
    viewer.clock.startTime = st;
    viewer.clock.stopTime = et;
    viewer.clock.currentTime = st;
    viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
    viewer.clock.multiplier = 1;
    viewer.clock.shouldAnimate = true;

    const pp = new Cesium.SampledPositionProperty();
    for (let i = 0; i < positions.length; i++) {
      const t = Cesium.JulianDate.addSeconds(st, (i / positions.length) * D, new Cesium.JulianDate());
      pp.addSample(t, positions[i]);
    }

    // 3D plane model (flip 180° because model faces backwards by default)
    const velOrientation = new Cesium.VelocityOrientationProperty(pp);
    const flipModel = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(180));

    // Camera follow - plane ke left side se
    let followActive = true;
    const planeEntity = viewer.entities.add({
      position: pp,
      model: { uri: './plane.glb', minimumPixelSize: 64, scale: 40 },
      orientation: new Cesium.CallbackProperty(function(time) {
        const q = velOrientation.getValue(time);
        if (!q) return Cesium.Quaternion.IDENTITY;
        return Cesium.Quaternion.multiply(q, flipModel, new Cesium.Quaternion());
      }, false)
    });
    viewer.scene.postUpdate.addEventListener(function cameraFollow() {
      if (!followActive) { viewer.scene.postUpdate.removeEventListener(cameraFollow); return; }
      const t = viewer.clock.currentTime;
      const pos = pp.getValue(t);
      const nextT = Cesium.JulianDate.addSeconds(t, 0.1, new Cesium.JulianDate());
      const nextPos = pp.getValue(nextT);
      if (pos && nextPos) {
        const dir = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.subtract(nextPos, pos, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        const up = Cesium.Cartesian3.normalize(Cesium.Cartesian3.clone(pos), new Cesium.Cartesian3());
        const right = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.cross(dir, up, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        const left = Cesium.Cartesian3.negate(right, new Cesium.Cartesian3());
        const offset = Cesium.Cartesian3.add(
          Cesium.Cartesian3.multiplyByScalar(left, 800, new Cesium.Cartesian3()),
          Cesium.Cartesian3.multiplyByScalar(up, 4000, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        );
        viewer.camera.lookAt(pos, offset);
      }
    });

    // Zoom out thora
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(originCity.lon, originCity.lat, 2000000),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45), roll: 0 },
      duration: 1.5
    });

    await new Promise(r => setTimeout(r, 1500));

    // Flight
    await new Promise(resolve => {
      const tick = viewer.clock.onTick.addEventListener(function() {
        if (Cesium.JulianDate.greaterThanOrEquals(viewer.clock.currentTime, et)) {
          tick();
          resolve();
        }
      });
    });

    followActive = false;
    viewer.trackedEntity = undefined;
    viewer.clock.shouldAnimate = false;

    statusEl.textContent = `Arrived! Loading buildings...`;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(destCity.lon, destCity.lat, 4000),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-55), roll: 0 },
      duration: 2
    });

    setTimeout(async () => {
      const ok = await loadOsmBuildings();
      statusEl.textContent = ok
        ? `Welcome to ${destCity.name}!`
        : `Landed at ${destCity.name}!`;
    }, 2000);

    flightActive = false;
    flyBtn.disabled = false;
    flyBtn.textContent = 'Fly Now';
  }

  flyBtn.addEventListener('click', async function() {
    if (flightActive) return;
    const oc = getCity(originSelect.value);
    const dc = getCity(destSelect.value);
    if (!oc || !dc) return;
    if (originSelect.value === destSelect.value) {
      statusEl.textContent = 'Pick different cities!';
      return;
    }
    console.log('Flight starting:', oc.name, '->', dc.name);
    await startFlight(oc, dc);
  });

  // Permanent plane at Karachi airport
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(67.1608, 24.9065, 300),
    model: { uri: './plane.glb', minimumPixelSize: 64, scale: 40 },
    orientation: new Cesium.CallbackProperty(function() {
      const hpr = Cesium.Transforms.headingPitchRollQuaternion(
        Cesium.Cartesian3.fromDegrees(67.1608, 24.9065, 300),
        new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(90), 0, 0)
      );
      const flip = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, Cesium.Math.toRadians(180));
      return Cesium.Quaternion.multiply(hpr, flip, new Cesium.Quaternion());
    }, false)
  });

  // Karachi airport - uper se dekho
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(67.1608, 24.9065, 4000),
    orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-55), roll: 0 },
    duration: 0
  });

  statusEl.textContent = 'Ready! Select cities and click Fly Now';
})();
