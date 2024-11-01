
let map;
let vectorSource;
let vectorLayer;
let userLocationFeature;
let destinationFeature;
let routeFeature;

function initMap() {
    vectorSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({
        source: vectorSource
    });

    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([-58.3817, -34.6033]),
            zoom: 12
        })
    });

    map.on('click', function (evt) {
        const coordinate = evt.coordinate;
        const lonLat = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
        setDestination(lonLat[1], lonLat[0]);
    });
}

function addMarker(lon, lat, isDestination = false) {
    const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat]))
    });

    const markerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
                color: isDestination ? '#1DB954' : '#000000'
            }),
            stroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 2
            })
        })
    });

    feature.setStyle(markerStyle);

    if (isDestination) {
        if (destinationFeature) {
            vectorSource.removeFeature(destinationFeature);
        }
        destinationFeature = feature;
    } else {
        if (userLocationFeature) {
            vectorSource.removeFeature(userLocationFeature);
        }
        userLocationFeature = feature;
    }

    vectorSource.addFeature(feature);
}

function clearMarkers() {
    vectorSource.clear();
    userLocationFeature = null;
    destinationFeature = null;
    routeFeature = null;
}

function getUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lon = position.coords.longitude;
            const lat = position.coords.latitude;

            addMarker(lon, lat);
            map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
            map.getView().setZoom(15);

            document.getElementById('pickupLocation').value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            alertify.success('Ubicación actual obtenida con éxito');

            if (destinationFeature) {
                calculateAndDisplayRoute();
            }
        }, function (error) {
            alertify.error('Error al obtener la ubicación: ' + error.message);
        });
    } else {
        alertify.error('Geolocalización no está disponible en tu navegador');
    }
}

function setDestination(lat, lon) {
    addMarker(lon, lat, true);
    document.getElementById('destination').value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    alertify.success('Destino seleccionado en el mapa');
    calculateAndDisplayRoute();
}

function calculateAndDisplayRoute() {
    if (!userLocationFeature || !destinationFeature) {
        alertify.error('Se necesitan ubicaciones de origen y destino para calcular la ruta');
        return;
    }

    const start = ol.proj.transform(userLocationFeature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');
    const end = ol.proj.transform(destinationFeature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');

    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const routeCoords = data.routes[0].geometry.coordinates;
                const lineString = new ol.geom.LineString(routeCoords).transform('EPSG:4326', 'EPSG:3857');

                if (routeFeature) {
                    vectorSource.removeFeature(routeFeature);
                }

                routeFeature = new ol.Feature({
                    geometry: lineString
                });

                routeFeature.setStyle(new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#1DB954',
                        width: 4
                    })
                }));

                vectorSource.addFeature(routeFeature);

                map.getView().fit(lineString, {
                    padding: [50, 50, 50, 50],
                    duration: 1000
                });

                alertify.success('Ruta calculada y mostrada en el mapa');
            } else {
                alertify.error('No se pudo calcular la ruta');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alertify.error('Error al calcular la ruta');
        });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

function updateAccount() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    if (username && email) {
        alertify.success('Información de cuenta actualizada');
    } else {
        alertify.error('Por favor, completa todos los campos');
    }
}

window.onload = function () {
    initMap();
    document.getElementById('requestRide').addEventListener('click', () => {
        const pickup = document.getElementById('pickupLocation').value;
        const destination = document.getElementById('destination').value;

        if (pickup && destination) {
            alertify.success(`¡Viaje solicitado!\nRecogida: ${pickup}\nDestino: ${destination}\nUn conductor llegará pronto.`);
            // Simular la adición de un viaje al historial
            const tripHistory = document.getElementById('tripHistory');
            const newTrip = document.createElement('li');
            newTrip.textContent = `Viaje de ${pickup} a ${destination}`;
            if (tripHistory.firstChild.textContent === 'No hay viajes recientes') {
                tripHistory.innerHTML = '';
            }
            tripHistory.appendChild(newTrip);
        } else {
            alertify.error('Por favor, ingresa una ubicación de recogida y un destino.');
        }
    });

    document.getElementById('clearLocations').addEventListener('click', () => {
        document.getElementById('pickupLocation').value = '';
        document.getElementById('destination').value = '';
        clearMarkers();
        alertify.success('Ubicaciones limpiadas');
    });

    document.getElementById('useMyLocation').addEventListener('click', getUserLocation);
};

alertify.set('notifier', 'position', 'top-right');
alertify.set('notifier', 'delay', 5);