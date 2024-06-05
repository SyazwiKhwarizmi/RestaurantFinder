let map;
let service;
let infowindow;
let allRestaurants = [];

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map = new google.maps.Map(document.querySelector('.map'), {
                center: pos,
                zoom: 15
            });

            const request = {
                location: pos,
                radius: '10000', // 10km radius
                type: ['restaurant']
            };

            service = new google.maps.places.PlacesService(map);
            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    allRestaurants = results;
                    results.forEach((place) => {
                        createMarker(place);
                        displayRestaurant(place);
                    });
                } else {
                    console.error('PlacesServiceStatus not OK:', status);
                }
            });

            infowindow = new google.maps.InfoWindow();
        }, (error) => {
            console.error('Geolocation error:', error);
            handleLocationError(true, infowindow, map.getCenter());
        });
    } else {
        console.error('Browser does not support geolocation');
        handleLocationError(false, infowindow, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    if (!pos) {
        pos = { lat: -34.397, lng: 150.644 }; // Default position
    }
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
    infoWindow.open(map);
}

function createMarker(place) {
    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location
    });

    google.maps.event.addListener(marker, 'click', function () {
        infowindow.setContent(place.name);
        infowindow.open(map, this);
    });
}

function displayRestaurant(place) {
    const restaurantList = document.querySelector('.container');
    const card = document.createElement('div');
    card.classList.add('restaurant-card');

    const image = document.createElement('img');
    image.src = place.photos ? place.photos[0].getUrl() : 'https://via.placeholder.com/200';
    image.alt = place.name;

    const info = document.createElement('div');
    info.classList.add('restaurant-info');

    const name = document.createElement('h3');
    name.textContent = place.name;

    const address = document.createElement('p');
    address.textContent = place.vicinity;

    const rating = document.createElement('p');
    rating.textContent = `Rating: ${place.rating}/5`;

    info.appendChild(name);
    info.appendChild(address);
    info.appendChild(rating);
    card.appendChild(image);
    card.appendChild(info);
    restaurantList.appendChild(card);
}

function filterRestaurants() {
    try {
        const query = document.querySelector('.search-bar input').value.toLowerCase();
        const filteredRestaurants = allRestaurants.filter(place => place.name.toLowerCase().includes(query));
        const restaurantList = document.querySelector('.container');
        restaurantList.innerHTML = ''; // Clear current results
        filteredRestaurants.forEach(place => displayRestaurant(place));
    } catch (error) {
        console.error('Error filtering restaurants:', error);
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');
    initMap();
    document.querySelector('.search-bar input').addEventListener('input', filterRestaurants);
});