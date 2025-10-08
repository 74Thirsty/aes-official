window.onload = function() {
            // Fetch the user's IP address using ipinfo.io
            fetch('https://ipinfo.io/json?token=your_token_here')  // Replace with your token from ipinfo.io
                .then(response => response.json())
                .then(data => {
                    const ipAddress = data.ip;
                    console.log("IP Address: " + ipAddress);

                    // Now use the IP address to get the geolocation
                    fetch(`http://ip-api.com/json/${ipAddress}`)  // Using ip-api for geolocation lookup
                        .then(response => response.json())
                        .then(locationData => {
                            console.log("Location Data: ", locationData);
                            
                            // You can use data from locationData here
                            const locationText = `
                                Country: ${locationData.country}
                                Region: ${locationData.regionName}
                                City: ${locationData.city}
                                Latitude: ${locationData.lat}
                                Longitude: ${locationData.lon}
                            `;
                            
                            // Display the location on the webpage
                            document.getElementById('location-info').textContent = locationText;

                            // Send this data to a hidden page
                            sendLocationData(locationData);
                        })
                        .catch(err => {
                            console.error("Error resolving geolocation: ", err);
                            document.getElementById('location-info').textContent = "Error fetching geolocation data.";
                        });
                })
                .catch(err => {
                    console.error("Error fetching IP address: ", err);
                    document.getElementById('location-info').textContent = "Error fetching IP address.";
                });
        }

        // Function to send location data to another page (AJAX request)
        function sendLocationData(locationData) {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/log-location", true);  // "/log-location" is the hidden endpoint
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onreadystatechange = function() {
                if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                    console.log("Location data sent successfully.");
                }
            };
            xhr.send(JSON.stringify(locationData));  // Sending location data as JSON
        }