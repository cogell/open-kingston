// CONFIG & CONSTANTS
// Set bounds to Kingston, NY
const bounds = [
  [-74.108931, 41.870328], // Southwest coordinates
  [-73.884398, 41.993181]  // Northeast coordinates
];

// const mapStyle = 'mapbox://styles/cogell/cj4myofhe7vy52sqpigqus5cl';
const mapStyle = 'mapbox://styles/mapbox/light-v9';

var mapLoaded = false;
var filteredResults = [];

mapboxgl.accessToken = 'pk.eyJ1IjoiY29nZWxsIiwiYSI6ImNqNGltcDQ2czAwOXkycW5yY3A3ZWwzYnMifQ.DFHlBiBaUSnxwi1vw5KeXQ';

// HELPER FUNCTIONS

// return array of kingston wards
function filterResults(results) {
  return _.filter(results.features, function(feature){
    if (feature.properties.Name) {
      return (
        feature.properties.Name.match(/kingston/i) &&
        feature.properties.Name.match(/ward/i)
      );
    }

    return false
  });
}

function cleanName(str) {
  return str.split(':')[1];
}

function addGeoJSONSource(sourceTitle, featureArray){
  if (!mapLoaded || !featureArray) { return; }

  console.log('sourceTitle', sourceTitle);
  console.log('featureArray', featureArray);

  map.addSource(sourceTitle, {
    "type": "geojson",
    "data": {
      "type": "FeatureCollection",
      "features": featureArray
    }
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
      "fill-opacity": 0.5,
    },
    "filter": ["==", "Name", ""]
  });

  // When the user moves their mouse over the states-fill layer, we'll update the filter in
  // the state-fills-hover layer to only show the matching state, thus making a hover effect.
  map.on("mousemove", "wards", function(e) {
    const name = e.features[0].properties.Name;

    map.setFilter("wards-hover", ["==", "Name", name]);
    document.getElementsByClassName('info')[0].textContent = cleanName(name);
  });

  // Reset the wards-hover layer's filter when the mouse leaves the layer.
  map.on("mouseleave", "wards", function() {
    map.setFilter("wards-hover", ["==", "Name", ""]);
  });
}

// MAIN
fetch('./static/geo-json/ulster-county-election-districts.json')
  .then(function(res){
    return res.json();
  })
  .then(function(json) {
    filteredResults = filterResults(json);
    addGeoJSONSource("wards", filteredResults);
  });

var map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    maxBounds: bounds,
  }).on('load', function () {
    mapLoaded = true;
    addGeoJSONSource("wards", filteredResults);
  });
