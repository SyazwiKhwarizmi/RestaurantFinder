let map;
let service;
let infowindow;
let directionsService;
let directionsRenderer;
const processedRestaurants = new Set();
let currentPosition;
let restaurantData = [];

async function initMap() {
    const loading = document.getElementById('loading');
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map = new google.maps.Map(document.getElementById('map'), {
                center: currentPosition,
                zoom: 15
            });

            infowindow = new google.maps.InfoWindow();

            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer();
            directionsRenderer.setMap(map);

            service = new google.maps.places.PlacesService(map);

            searchPlaces();

            loading.style.display = 'none';
        }, () => {
            handleLocationError(true);
            loading.textContent = 'Error: The Geolocation service failed.';
        });
    } else {
        handleLocationError(false);
        loading.textContent = 'Error: Your browser doesn\'t support geolocation.';
    }
}

function handleLocationError(browserHasGeolocation) {
    const loading = document.getElementById('loading');
    loading.textContent = browserHasGeolocation
        ? 'Error: The Geolocation service failed.'
        : 'Error: Your browser doesn\'t support geolocation.';
}

function searchPlaces() {
    const selectedType = document.getElementById('type').value;
    const requests = [
        { location: currentPosition, radius: '10000', type: [selectedType], openNow: true }
    ];

    requests.forEach(request => {
        service.nearbySearch(request, (results, status) => {
            callback(results, status, request.type[0]);
        });
    });
}

function callback(results, status, type) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        restaurantData = []; // Clear previous results
        for (let i = 0; i < results.length; i++) {
            if (results[i].opening_hours && results[i].opening_hours.open_now && !processedRestaurants.has(results[i].place_id)) {
                processedRestaurants.add(results[i].place_id);
                service.getDetails({ placeId: results[i].place_id }, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        restaurantData.push(place);
                        createMarker(place, type);
                        displayRestaurants();
                    }
                });
            }
        }
    }
}

function createMarker(place, type) {
    if (!place.geometry || !place.geometry.location) return;

    const marker = new google.maps.Marker({
        map,
        position: place.geometry.location,
        icon: getMarkerIcon(type)
    });

    google.maps.event.addListener(marker, 'click', () => {
        const reviews = place.reviews ? place.reviews.map(review => `<p>${review.text}</p>`).join('') : 'No reviews available';
        infowindow.setContent(`
            <div>
                <strong>${place.name}</strong><br>
                ${place.vicinity}<br>
                Rating: ${place.rating}/5<br>
                ${reviews}
            </div>
        `);
        infowindow.open(map, marker);
        calculateAndDisplayRoute(place.geometry.location);
    });
}

function getMarkerIcon(type) {
    switch (type) {
        case 'restaurant':
            return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'bakery':
            return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        case 'meal_takeaway':
            return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
        case 'cafe':
            return 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
        default:
            return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    }
}

function calculateAndDisplayRoute(destination) {
    directionsService.route(
        {
            origin: currentPosition,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        },
        (response, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(response);
            } else {
                let errorMessage = 'Directions request failed due to ';
                switch (status) {
                    case google.maps.DirectionsStatus.ZERO_RESULTS:
                        errorMessage += 'no route could be found between the origin and destination.';
                        break;
                    case google.maps.DirectionsStatus.NOT_FOUND:
                        errorMessage += 'the origin or destination could not be geocoded.';
                        break;
                    case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
                        errorMessage += 'the application has gone over its request quota.';
                        break;
                    case google.maps.DirectionsStatus.REQUEST_DENIED:
                        errorMessage += 'the application is not allowed to use the directions service.';
                        break;
                    case google.maps.DirectionsStatus.INVALID_REQUEST:
                        errorMessage += 'the provided request is invalid.';
                        break;
                    default:
                        errorMessage += 'an unknown error occurred.';
                        break;
                }
                window.alert(errorMessage);
            }
        }
    );
}

function displayRestaurants() {
    const restaurantList = document.querySelector('.restaurantList');
    restaurantList.innerHTML = ''; // Clear previous results

    const sortType = document.getElementById('sort').value;

    if (sortType === 'rating') {
        restaurantData.sort((a, b) => b.rating - a.rating);
    } else if (sortType === 'distance') {
        restaurantData.sort((a, b) => {
            const distanceA = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(currentPosition), a.geometry.location);
            const distanceB = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(currentPosition), b.geometry.location);
            return distanceA - distanceB;
        });
    }

    restaurantData.forEach(place => {
        const card = document.createElement('div');
        card.classList.add('restaurant-card');

        const image = document.createElement('img');
        image.src = place.photos ? place.photos[0].getUrl() : 'default-restaurant.jpg';
        image.alt = place.name;

        const info = document.createElement('div');
        info.classList.add('restaurant-info');

        const name = document.createElement('h3');
        name.textContent = place.name;

        const address = document.createElement('p');
        address.textContent = place.vicinity;

        const rating = document.createElement('p');
        rating.textContent = `Rating: ${place.rating}/5`;

        const reviews = place.reviews ? place.reviews.map(review => `<p>${review.text}</p>`).join('') : 'No reviews available';

        info.appendChild(name);
        info.appendChild(address);
        info.appendChild(rating);
        info.innerHTML += reviews;
        card.appendChild(image);
        card.appendChild(info);
        restaurantList.appendChild(card);

        card.addEventListener('click', () => {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}&travelmode=driving`;
            window.open(googleMapsUrl, '_blank');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.textContent = 'Loading map and locating you...';
    document.body.insertBefore(loading, document.body.firstChild);
    initMap();

    const typeSelect = document.getElementById('type');
    typeSelect.addEventListener('change', () => {
        processedRestaurants.clear();
        document.querySelector('.restaurantList').innerHTML = ''; // Clear previous results
        searchPlaces();
    });

    const sortSelect = document.getElementById('sort');
    sortSelect.addEventListener('change', displayRestaurants);
});
