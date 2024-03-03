const platform = new H.service.Platform({
  'apikey': "kHI6W1H5g6eh-3Tz8Hl4RDMXtKSf_GZ5sA5VdTPRAf8"
});

// Get default map types from the platform object:
const defaultLayers = platform.createDefaultLayers();

// Instantiate (and display) a map:
var map = new H.Map(
  document.getElementById("map"),
  defaultLayers.raster.normal.map, {
      zoom: 3,
      center: {lat: 0, lng: 0},
      pixelRatio: window.devicePixelRatio || 1
  });


function toggleNightMode() {
  var body = document.body;
  body.classList.toggle('night-mode');
  updateMapStyles();
}

function updateMapStyles() {
  var nightModeCheckbox = document.getElementById('nightModeCheckbox');
  console.log(nightModeCheckbox)
  if (nightModeCheckbox.checked) {
      map.setBaseLayer(defaultLayers.raster.normal.mapnight);
  } else {
      map.setBaseLayer(defaultLayers.raster.normal.map);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Get the panel element
  var panel = document.getElementById('panel');
  var placeHolderText = document.getElementById('placeHolderText');

  // Set a temporary placeholder text if the panel is empty
  if (panel.textContent.trim() === '') {
    placeHolderText.textContent = 'Enter a Start and End Address to receive Directions';
  }
});

// Implement interactions for pan/zoom 
const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));

// Disable zoom on double-tap to allow removing waypoints on double-tap
behavior.disable(H.mapevents.Behavior.Feature.DBL_TAP_ZOOM);

window.addEventListener('resize', () => map.getViewPort().resize());

// Create the default UI:
var ui = H.ui.UI.createDefault(map, defaultLayers, );

// ROUTING LOGIC STARTS HERE

// This variable holds the instance of the route polyline
let routePolyline;

var updateBounds = true;
/** Handler for the H.service.RoutingService8
* @param {object} response The response object returned by calculateRoute method */
function routeResponseHandler(response) {
  const route = response.routes[0];
  const sections = response.routes[0].sections;
  const lineStrings = [];
  sections.forEach((section) => {
      // convert Flexible Polyline encoded string to geometry
      lineStrings.push(H.geo.LineString.fromFlexiblePolyline(section.polyline));
  });
  const multiLineString = new H.geo.MultiLineString(lineStrings);

  // Create the polyline for the route
  if (routePolyline) {
      routePolyline.setGeometry(multiLineString);
  } else {
      // If routePolyline is not yet defined, create new H.map.Polyline
      routePolyline = new H.map.Polyline(multiLineString, {
          style: {lineWidth: 5}
      });
  }

  // Remove placeholder text
  var placeHolderText = document.getElementById('placeHolderText');
  placeHolderText.textContent = '';

  // Add the polyline to the map
  map.addObject(routePolyline);
  // Add respective text to the panel
  addManueversToPanel(route);
  addSummaryToPanel(route);

  // Update map view to zoom into new bounds
  if (updateBounds == true) {
      map.getViewModel().setLookAtData({
      bounds: routePolyline.getBoundingBox()
    });
    updateBounds = false;
  }
}

var mapContainer = document.getElementById('map')
var routeInstructionsContainer = document.getElementById('panel')

/** Returns an instance of H.map.Icon to style the markers
* @param {number|string} id An identifier that will be displayed as marker label
* @return {H.map.Icon}*/
function getMarkerIcon(id) {
  const svgCircle = `<svg width="30" height="30" version="1.1" xmlns="http://www.w3.org/2000/svg">
<g id="marker">
  <circle cx="15" cy="15" r="10" fill="#0099D8" stroke="#0099D8" stroke-width="4" />
  <text x="50%" y="50%" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="12px" dy=".3em">${id}</text>
</g></svg>`;
  return new H.map.Icon(svgCircle, {
      anchor: {x: 10, y: 10}
  });
}

/** Create an instance of H.map.Marker and add it to the map
* @param {object} position  An object with 'lat' and 'lng' properties defining the position of the marker
* @param {string|number} id An identifier that will be displayed as marker label
* @return {H.map.Marker} The instance of the marker that was created */
function addMarker(position, id) {
  // Create new marker object
  const marker = new H.map.Marker(position, {
      data: {
          id
      },
      icon: getMarkerIcon(id),
      // Enable smooth dragging
      volatility: true
  });

  // Enable draggable markers
  marker.draggable = true;

  map.addObject(marker);
  return marker;
}

function updateRoute() {
  clearPanel();
  routingParams.via = new H.service.Url.MultiValueQueryParameter(
      waypoints.map(wp => `${wp.getGeometry().lat},${wp.getGeometry().lng}`));

  // Call the routing service with the defined parameters
  router.calculateRoute(routingParams, routeResponseHandler, console.error);
  updateStats();
}

// Listen when the route submite button is pressed
document.getElementById('submitButton').addEventListener('click', function(event) {
  submitForm(event);
});

function submitForm(event) {
  event.preventDefault();
  clearMap();
  var origin = document.getElementById('startAddress').value;
  var destination = document.getElementById('endAddress').value;
  
  if (origin === '' || destination === '') {
    // Display an error message
    alert('Please enter both start and end addresses.');
    return; // Stop further execution of the function
  }
  
  // Convert from address to coordinates
  geocode(platform, origin, function(startLocation) {
    geocode(platform, destination, function(endLocation) {
      routingParams.origin = `${startLocation.lat},${startLocation.lng}`;
      routingParams.destination = `${endLocation.lat},${endLocation.lng}`;
      const origin = {
        lat: startLocation.lat,
        lng: startLocation.lng
      };
      const destination = {
        lat: endLocation.lat,
        lng: endLocation.lng
      };
      // Add start and end markers on the map
      addMarker(origin, 'A');
      addMarker(destination, 'B');

      updateRoute();
    });
  });
}

function clearMap() {
  map.getObjects().forEach(function(object) {
    if (object instanceof H.map.Polyline) {
      map.removeObject(object);
    }
  });

  map.getObjects().forEach(function(object) {
    if (object instanceof H.map.Marker) {
      map.removeObject(object);
    }
  });

  map.getObjects().forEach(function(object) {
    if (object instanceof H.map.Group) {
      map.removeObject(object);
    }
  });

  waypoints.splice(0, waypoints.length);

}

function clearPanel() {
  routeInstructionsContainer.innerHTML = '';
  document.getElementById('time').value = '';
  document.getElementById('speed').value = '';
}

function geocode(platform, address, callback) {
  var geocoder = platform.getSearchService(),
      geocodingParameters = {
        q: address
      };

  geocoder.geocode(
    geocodingParameters,
    function(result) {
      if (result.items.length > 0) {
        var location = result.items[0].position;
        callback(location);
      } else {
        // If no results are found, handle the error
        onError("Address not found: " + address);
      }
    },
    function(error) {
      // Handle the error if geocoding fails
      onError("Geocoding failed for address: " + address);
    }
  );
}

function onSuccessGeocode(result) {
  var location = result.items[0].position;
  console.log(location);
  return location;
}

/** * @param  {Object} error  The error message received.*/
function onError(error) {
  alert(error);
}

const origin = {
  lat: 0,
  lng: 0
};
const destination = {
  lat: 0,
  lng: 0
};

// holds instances of H.map.Marker 
const waypoints = []

// Define the routing service parameters
const routingParams = {
  'origin': `${origin.lat},${origin.lng}`,
  'destination': `${destination.lat},${destination.lng}`,
  'via': new H.service.Url.MultiValueQueryParameter(waypoints),
  'transportMode': 'pedestrian',
  'avoid[features]': 'ferry',
  'return': 'polyline,turnByTurnActions,actions,instructions,travelSummary'
};

// Get an instance of the H.service.RoutingService8 service
const router = platform.getRoutingService(null, 8);

// Listen to the dragstart and store relevant position information of the marker
map.addEventListener('dragstart', function(ev) {
  const target = ev.target;
  const pointer = ev.currentPointer;
  if (target instanceof H.map.Marker) {
      // Disable the default draggability of the underlying map
      behavior.disable(H.mapevents.Behavior.Feature.PANNING);

      var targetPosition = map.geoToScreen(target.getGeometry());
      // Calculate the offset between mouse and target's position
      // when starting to drag a marker object
      target['offset'] = new H.math.Point(
          pointer.viewportX - targetPosition.x, pointer.viewportY - targetPosition.y);
  }
}, false);

// Listen to the dragend and update the route
map.addEventListener('dragend', function(ev) {
  const target = ev.target;
  if (target instanceof H.map.Marker) {
      // re-enable the default draggability of the underlying map
      behavior.enable(H.mapevents.Behavior.Feature.PANNING);
      const coords = target.getGeometry();
      const markerId = target.getData().id;

      // In case the dragged marker is the origin or destination
      if (markerId === 'A') {
          routingParams.origin = `${coords.lat},${coords.lng}`;
      } else if (markerId === 'B') {
          routingParams.destination = `${coords.lat},${coords.lng}`;
      }
      updateRoute();
  }
}, false);

// Listen to the drag event and move the position of the marker 
map.addEventListener('drag', function(ev) {
  const target = ev.target;
  const pointer = ev.currentPointer;
  if (target instanceof H.map.Marker) {
      target.setGeometry(
          map.screenToGeo(pointer.viewportX - target['offset'].x, pointer.viewportY - target['offset'].y)
      );
  }
}, false);

// Add new waypoint on click
map.addEventListener('tap', function(ev) {
  const target = ev.target;
  const pointer = ev.currentPointer;
  const coords = map.screenToGeo(pointer.viewportX, pointer.viewportY);

  if (!(target instanceof H.map.Marker)) {
      const marker = addMarker(coords, waypoints.length + 1);
      waypoints.push(marker);
      updateRoute();
  }
});

// Remove waypoint on double click
map.addEventListener('dbltap', function(ev) {
  const target = ev.target;

  if (target instanceof H.map.Marker) {
      // Prevent origin or destination markers from being removed
      if (['origin', 'destination'].indexOf(target.getData().id) !== -1) {
          return;
      }
      const markerIdx = waypoints.indexOf(target);
      if (markerIdx !== -1) {
          // Remove the marker from the array of way points
          waypoints.splice(markerIdx, 1)
          // Iterate over the remaining waypoints and update their data
          waypoints.forEach((marker, idx) => {
              const id = idx + 1;
              // Update marker's id
              marker.setData({
                  id
              });
              // Update marker's icon to show its new id
              marker.setIcon(getMarkerIcon(id))
          });
      }

      // Remove the marker from the map
      map.removeObject(target);

      updateRoute();
  }
});


// Function to calculate time based on distance and speed
function calculateTime(distance, speed) {
  return distance / speed;
}

// Function to calculate distance based on time and speed
function calculateSpeed(distance, time) {
  return distance / time;
}

function updateStats() {
  document.getElementById('speed').addEventListener('input', function() {
  var speed = parseFloat(this.value);
  var distance = parseFloat(document.getElementById('distance').placeholder);

  var time = calculateTime(distance, speed);
  document.getElementById('time').value = time.toFixed(2);
});

  document.getElementById('time').addEventListener('input', function() {
    var time = parseFloat(this.value);
    var distance = parseFloat(document.getElementById('distance').placeholder);

    var speed = calculateSpeed(distance, time);
    document.getElementById('speed').value = speed.toFixed(2);
  });
}



/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addSummaryToPanel(route){
  var distancestat = document.getElementById("distance");

  let distance = 0;

  route.sections.forEach((section) => {
    distance += section.travelSummary.length;
  });

  distancestat.placeholder = distance + "m";
}

/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addManueversToPanel(route){
  var nodeOL = document.createElement('ol');

  nodeOL.style.fontSize = 'small';
  nodeOL.style.marginLeft ='5%';
  nodeOL.style.marginRight ='5%';
  nodeOL.className = 'directions';

  route.sections.forEach((section) => {
    section.actions.forEach((action, idx) => {
      if (action.action == 'arrive') {
        return;
      }
      var li = document.createElement('li'),
          spanArrow = document.createElement('span'),
          spanInstruction = document.createElement('span');

      spanArrow.className = 'arrow ' + (action.direction || '') + action.action;
      spanInstruction.innerHTML = section.actions[idx].instruction;
      
      li.appendChild(spanArrow);
      li.appendChild(spanInstruction);

      nodeOL.appendChild(li);
    });
  });

  routeInstructionsContainer.appendChild(nodeOL);
}


Number.prototype.toMMSS = function () {
  return  Math.floor(this / 60)  +' minutes '+ (this % 60)  + ' seconds.';
}
