


//BOILERPLATE CODE TO INITIALIZE THE MAP
const platform = new H.service.Platform({
  'apikey': "kHI6W1H5g6eh-3Tz8Hl4RDMXtKSf_GZ5sA5VdTPRAf8"
});

// Obtain the default map types from the platform object:
const defaultLayers = platform.createDefaultLayers();

// Instantiate (and display) a map:
var map = new H.Map(
  document.getElementById("map"),
  defaultLayers.raster.normal.map, {
      zoom: 2,
      center: {
          lat: 0,
          lng: 0
      },
      pixelRatio: window.devicePixelRatio || 1
  });




function toggleNightMode() {
  var body = document.body;
  body.classList.toggle('night-mode');
  updateMapStyles();
}

function updateMapStyles() {
  var mapContainer = document.getElementById('map');
  var panelContainer = document.getElementById('panel');
  var nightModeCheckbox = document.getElementById('nightModeCheckbox');
  console.log(nightModeCheckbox)
  if (nightModeCheckbox.checked) {
      // mapContainer.style.background = '#414a4c';
      // panelContainer.style.color = '#fff';
      map.setBaseLayer(defaultLayers.raster.normal.mapnight);
  } else {
      // mapContainer.style.background = 'grey';
      // panelContainer.style.color = ''; // Use your original text color
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

// MapEvents enables the event system
// Behavior implements default interactions for pan/zoom (also on mobile touch environments)
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
/**
* Handler for the H.service.RoutingService8#calculateRoute call
*
* @param {object} response The response object returned by calculateRoute method
*/
function routeResponseHandler(response) {
  const route = response.routes[0];
  const sections = response.routes[0].sections;
  const lineStrings = [];
  sections.forEach((section) => {
      // convert Flexible Polyline encoded string to geometry
      lineStrings.push(H.geo.LineString.fromFlexiblePolyline(section.polyline));
  });
  const multiLineString = new H.geo.MultiLineString(lineStrings);
  const bounds = multiLineString.getBoundingBox();

  // Create the polyline for the route
  if (routePolyline) {
      // If the routePolyline we just set has the new geometry
      routePolyline.setGeometry(multiLineString);
  } else {
      // If routePolyline is not yet defined, instantiate a new H.map.Polyline
      routePolyline = new H.map.Polyline(multiLineString, {
          style: {
              lineWidth: 5
          }
      });
  }

  var placeHolderText = document.getElementById('placeHolderText');
  placeHolderText.textContent = '';

  // Add the polyline to the map
  map.addObject(routePolyline);
  addManueversToPanel(route);
  addSummaryToPanel(route);

  if (updateBounds == true) {
      map.getViewModel().setLookAtData({
      bounds: routePolyline.getBoundingBox()
    });
    updateBounds = false;
  }

}

var mapContainer = document.getElementById('map'),
  routeInstructionsContainer = document.getElementById('panel')

mapContainer.addEventListener('mouseenter', function () {
  // Zoom in when the mouse enters the map container
  map.setZoom(map.getZoom() + 0.1, true, {onStart: function(){ behavior.disable(); }, onEnd: function(){ behavior.enable(); } });
});

mapContainer.addEventListener('mouseleave', function () {
  map.setZoom(map.getZoom() - 0.1, true, {onStart: function(){ behavior.disable(); }, onEnd: function(){ behavior.enable(); } });
});


/**
* Returns an instance of H.map.Icon to style the markers
* @param {number|string} id An identifier that will be displayed as marker label
*
* @return {H.map.Icon}
*/
function getMarkerIcon(id) {
  const svgCircle = `<svg width="30" height="30" version="1.1" xmlns="http://www.w3.org/2000/svg">
<g id="marker">
  <circle cx="15" cy="15" r="10" fill="#0099D8" stroke="#0099D8" stroke-width="4" />
  <text x="50%" y="50%" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="12px" dy=".3em">${id}</text>
</g></svg>`;
  return new H.map.Icon(svgCircle, {
      anchor: {
          x: 10,
          y: 10
      }
  });
}

/**
* Create an instance of H.map.Marker and add it to the map
*
* @param {object} position  An object with 'lat' and 'lng' properties defining the position of the marker
* @param {string|number} id An identifier that will be displayed as marker label
* @return {H.map.Marker} The instance of the marker that was created
*/
function addMarker(position, id) {
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

/**
* This method calls the routing service to retrieve the route line geometry
*/
function updateRoute() {
  clearPanel();
  routingParams.via = new H.service.Url.MultiValueQueryParameter(
      waypoints.map(wp => `${wp.getGeometry().lat},${wp.getGeometry().lng}`));

  // Call the routing service with the defined parameters
  router.calculateRoute(routingParams, routeResponseHandler, console.error);
}

document.getElementById('submitButton').addEventListener('click', function(event) {
  submitForm(event);
});

function submitForm(event) {
  event.preventDefault();
  clearMap();
  var origin = document.getElementById('startAddress').value;
  var destination = document.getElementById('endAddress').value;
  geocode(platform, origin, function(startLocation) {
    geocode(platform, destination, function(endLocation) {
      console.log(`${startLocation.lat},${startLocation.lng}`);
      routingParams.origin = `${startLocation.lat},${startLocation.lng}`;
      console.log(endLocation.lat + ',' + endLocation.lng);
      routingParams.destination = `${endLocation.lat},${endLocation.lng}`;
      const origin = {
        lat: startLocation.lat,
        lng: startLocation.lng
      };
      const destination = {
        lat: endLocation.lat,
        lng: endLocation.lng
      };
      const originMarker = addMarker(origin, 'A');
      const destinationMarker = addMarker(destination, 'B');
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
}

function geocode(platform, address, callback) {
  var geocoder = platform.getSearchService(),
      geocodingParameters = {
        q: address
      };

  geocoder.geocode(
    geocodingParameters,
    function(result) {
      var location = result.items[0].position;
      callback(location);
    },
    onError
  );
}

function onSuccessGeocode(result) {
  var location = result.items[0].position;
  console.log(location);
  return location;
}

/**
 * @param  {Object} error  The error message received.
 */
function onError(error) {
  alert('Can\'t reach the remote server');
}

const origin = {
  lat: 0,
  lng: 0
};
const destination = {
  lat: 0,
  lng: 0
};

// CALCULATE THE ROUTE BETWEEN THE TWO WAYPOINTS
// This array holds instances of H.map.Marker representing the route waypoints
const waypoints = []

// Define the routing service parameters
const routingParams = {
  'origin': `${origin.lat},${origin.lng}`,
  'destination': `${destination.lat},${destination.lng}`,
  // defines multiple waypoints
  'via': new H.service.Url.MultiValueQueryParameter(waypoints),
  'transportMode': 'pedestrian',
  'avoid[features]': 'ferry',
  'return': 'polyline,turnByTurnActions,actions,instructions,travelSummary'
};

// Get an instance of the H.service.RoutingService8 service
const router = platform.getRoutingService(null, 8);

// Call the routing service with the defined parameters and display the route
// updateRoute();

/**
* Listen to the dragstart and store relevant position information of the marker
*/
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

/**
* Listen to the dragend and update the route
*/
map.addEventListener('dragend', function(ev) {
  const target = ev.target;
  if (target instanceof H.map.Marker) {
      // re-enable the default draggability of the underlying map
      // when dragging has completed
      behavior.enable(H.mapevents.Behavior.Feature.PANNING);
      const coords = target.getGeometry();
      const markerId = target.getData().id;

      // Update the routing params `origin` and `destination` properties
      // in case we dragging either the origin or the destination marker
      if (markerId === 'A') {
          routingParams.origin = `${coords.lat},${coords.lng}`;
      } else if (markerId === 'B') {
          routingParams.destination = `${coords.lat},${coords.lng}`;
      }

      updateRoute();
  }
}, false);

/**
* Listen to the drag event and move the position of the marker as necessary
*/
map.addEventListener('drag', function(ev) {
  const target = ev.target;
  const pointer = ev.currentPointer;
  if (target instanceof H.map.Marker) {
      target.setGeometry(
          map.screenToGeo(pointer.viewportX - target['offset'].x, pointer.viewportY - target['offset'].y)
      );
  }
}, false);

/**
* Listen to the tap event to add a new waypoint
*/
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

/**
* Listen to the dbltap event to remove a waypoint
*/
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


/**
 * Creates a series of H.map.Marker points from the route and adds them to the map.
 * @param {Object} route  A route as received from the H.service.RoutingService
 */
function addSummaryToPanel(route){
  let duration = 0,
      distance = 0;

  route.sections.forEach((section) => {
    distance += section.travelSummary.length;
    duration += section.travelSummary.duration;
  });

  var summaryDiv = document.createElement('div'),
   content = '';
   content += '<b>Total distance</b>: ' + distance  + 'm. <br/>';
   content += '<b>Travel Time</b>: ' + duration.toMMSS();


  summaryDiv.style.fontSize = 'small';
  summaryDiv.style.marginLeft ='5%';
  summaryDiv.style.marginRight ='5%';
  summaryDiv.innerHTML = content;
  routeInstructionsContainer.appendChild(summaryDiv);
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
