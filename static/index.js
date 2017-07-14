// CONFIG & CONSTANTS
// Set bounds to Kingston, NY
const bounds = [
  [-74.108931, 41.870328], // Southwest coordinates
  [-73.884398, 41.993181]  // Northeast coordinates
];

// const mapStyle = 'mapbox://styles/cogell/cj4myofhe7vy52sqpigqus5cl';
const mapStyle = 'mapbox://styles/mapbox/light-v9';

var mapLoaded = false;
var wardFeatureCollection = [];

mapboxgl.accessToken = 'pk.eyJ1IjoiY29nZWxsIiwiYSI6ImNqNGltcDQ2czAwOXkycW5yY3A3ZWwzYnMifQ.DFHlBiBaUSnxwi1vw5KeXQ';

// HELPER FUNCTIONS


// GeoJSON: results -> GeoJSON?: wards (with dissolved districts)
function filterResults(results) {
  const wardsWithDistricts = _.filter(results.features, function(feature){
    if (feature.properties.Name) {
      return (
        feature.properties.Name.match(/kingston/i) &&
        feature.properties.Name.match(/ward/i)
      );
    }

    return false
  });

  return dissolveDistricts(wardsWithDistricts);
}

// String -> String
function getHumanWardName(str) {
  // Kingston (City): Ward 1 - District 1 -> Ward 1
  return str.split(':')[1].split('-')[0];
}

// FeatureCollection? -> FeatureCollection
function dissolveDistricts(featureArray) {
  // add ward number to properties
  const annotatedFeatures = _.map(featureArray, function(feature){
    const wardNumber = feature.properties.Name.match(/\d/)[0];
    const newFeature = _.merge(feature, { properties: { ward: wardNumber } });

    return newFeature;
  });
  const annotatedCollection = turf.featureCollection(annotatedFeatures);

  return turf.dissolve(annotatedCollection, 'ward');
}

// non-pure function
function mapWardsGeoJSON(){
  if (!mapLoaded || !wardFeatureCollection) { return; }
  const sourceTitle = "wards";

  map.addSource(sourceTitle, {
    "type": "geojson",
    "data": wardFeatureCollection
  });

  map.addLayer({
    "id": "wards-outlines",
    "type": "line",
    "source": sourceTitle,
    "paint": {
      "line-color": "#888888",
      "line-opacity": 0.5
    },
  });

  map.addLayer({
    "id": "wards",
    "type": "fill",
    "source": sourceTitle,
    "paint": {
      "fill-color": "#888888",
      "fill-opacity": 0.1,
    },
  });

  map.addLayer({
    "id": "wards-hover",
    "type": "fill",
    "source": sourceTitle,
    "paint": {
      "fill-color": "#888888",
      "fill-opacity": 0.3,
    },
    "filter": ["==", "Name", ""]
  });

  map.on("mousemove", "wards", onMouseOver);

  // Reset the wards-hover layer's filter when the mouse leaves the layer.
  map.on("mouseleave", "wards", function() {
    map.setFilter("wards-hover", ["==", "Name", ""]);
  });
}

function onMouseOver(e) {
  const wardName = e.features[0].properties.Name;
  const humanWardName = getHumanWardName(wardName)

  // When the user moves their mouse over the states-fill layer, we'll update the filter in
  // the "wards-hover "layer to only show the matching state, thus making a hover effect.
  map.setFilter("wards-hover", ["==", "Name", wardName]);
  updateInfoLabel(humanWardName);
  // placeLabelOnWardCenter(wardName);
  placeWardLabelUnderMouse(e.lngLat, humanWardName)
}

function getWardFeatureByName(name) {
  return _.find(wardFeatureCollection.features, function (feature) {
    return feature.properties.Name === name;
  })
}

function placeWardLabelUnderMouse(lngLat, wardName) {
  if (!window.wardMarker) {
    const wardMarkerWapper = document.createElement('div');
    wardMarkerWapper.id = 'ward-label-marker-wrapper';
    const wardMarkerText = document.createElement('div');
    wardMarkerText.id = 'ward-label-marker';
    wardMarkerWapper.appendChild(wardMarkerText);

    window.wardMarker = new mapboxgl.Marker(wardMarkerWapper);
    wardMarker.addTo(map);
  }

  wardMarker.setLngLat(lngLat);
  document.getElementById('ward-label-marker').textContent = wardName;
}

// non-pure function
function placeLabelOnWardCenter(wardFeatureName) {
  // create new Maker as needed
  if (!window.wardMarker) {
    const wardMarkerWapper = document.createElement('div');
    wardMarkerWapper.id = 'ward-label-marker-wrapper';
    const wardMarkerText = document.createElement('div');
    wardMarkerText.id = 'ward-label-marker';
    wardMarkerWapper.appendChild(wardMarkerText);

    window.wardMarker = new mapboxgl.Marker(wardMarkerWapper);
    wardMarker.addTo(map);
  }

  const wardFeature = getWardFeatureByName(wardFeatureName);
  const wardCenter = turf.centerOfMass(wardFeature);
  const humanWardName = getHumanWardName(wardFeatureName);
  wardMarker.setLngLat(featurePointToLngLat(wardCenter));
  document.getElementById('ward-label-marker').textContent = humanWardName;
}

// Feature<Point> -> LngLat
function featurePointToLngLat(featurePoint) {
  const lng = featurePoint.geometry.coordinates[0];
  const lat = featurePoint.geometry.coordinates[1];
  return [lng, lat];
}

function getFeatureById(featureArray, id) {
  return _.find(featureArray, function(ft){
    return ft.layer.id === id;
  });
}

function getFeatureProp(feature, prop) {
  return feature.properties[prop];
}

// FIXME: fails when you call this while map is "flying"?
function getWardFromLngLat(lngLat) {
  const pointOnMap = map.project(lngLat);
  const featureArray = map.queryRenderedFeatures(pointOnMap);
  const wardFeature = getFeatureById(featureArray, 'wards'); // make constant
  const name = getFeatureProp(wardFeature, 'Name');
  return getHumanWardName(name);
}

function updateInfoLabel(str) {
  document.getElementsByClassName('info')[0].textContent = str;
}

function onGeocoderResult (result) {
  // add marker as needed
  if (!window.addressMarker) {
    window.addressMarker = new mapboxgl.Marker();
    addressMarker.addTo(map);
  }

  const lngLat = result.result.center;
  const wardName = getWardFromLngLat(lngLat);

  updateInfoLabel(wardName);
  addressMarker.setLngLat(lngLat);
}

//// MAIN
fetch('./static/geo-json/ulster-county-election-districts.json')
  .then(function(res){
    return res.json();
  })
  .then(function(json) {
    wardFeatureCollection = filterResults(json);
    mapWardsGeoJSON();
  });

// https://github.com/mapbox/mapbox-gl-geocoder/blob/master/API.md
window.geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    bbox: _.flattenDeep(bounds),
    types: 'address'
  })
  .on('result', onGeocoderResult);

// https://www.mapbox.com/mapbox-gl-js/api/#map
window.map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    maxBounds: bounds,
  }).on('load', function () {
    mapLoaded = true;
    mapWardsGeoJSON();
  }).
  addControl(geocoder);
