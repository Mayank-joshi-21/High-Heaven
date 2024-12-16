
// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
    'use strict'
  
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')
  
    // Loop over them and prevent submission
    Array.from(forms).forEach(form => {
      form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }
  
        form.classList.add('was-validated')
      }, false)
    })
  })()
  
  function payNow() {
    // Retrieve the dynamic amount from the HTML element
    const priceElement = document.getElementById("price"); // Ensure an element with this ID exists
    const amount = parseInt(priceElement.getAttribute("data-price"), 10); // Extract the price from the data attribute

    // Retrieve checkin, checkout, and guests
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const guests = document.getElementById("guests").value;

    // Validate the amount
    if (isNaN(amount) || amount <= 0) {
        alert("Invalid price. Please try again.");
        return;
    }

    // Validate the other fields
    if (!checkin || !checkout || !guests) {
        alert("Please fill in all the required fields.");
        return;
    }

    // Create order on the server
    fetch("/create-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount, checkin, checkout, guests }),  // Send all required data
    })
    .then((response) => response.json())
    .then((data) => {
        const options = {
            key: "rzp_test_exhA8WM645dgvm", 
            amount: amount * 100, // Convert to the smallest currency unit
            currency: "INR",
            name: "High Heaven",
            description: "Room Reservation",
            order_id: data.orderId, // Razorpay order ID received from the server
            handler: function(response) {
                // Log payment and order details
                console.log('Payment ID:', response.razorpay_payment_id);
                console.log('Order ID:', response.razorpay_order_id);
            
                const paymentData = {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id
                };
            
                // Send the payment data to the backend
                fetch("/update-booking", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(paymentData)
                })
                .then((res) => res.json())
                .then((data) => {
                    console.log("Booking updated response:", data);
            
                    // Redirect to the orders page
                    // window.location.href = '/listings'; // Navigate to the orders page
                })
                .catch((error) => {
                    console.error("Error updating booking:", error);
                });
            
                alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
                const reserveButtons = document.getElementsByClassName('green');
                Array.from(reserveButtons).forEach((button) => {
                    button.textContent = 'Reserved';
                    button.style.setProperty('background-color', 'red', 'important');
                    button.disabled = true;
                });
            },
            
            prefill: {
                name: "",
                email: "johndoe@example.com",
                contact: "9999999999",
            },
            theme: {
                color: "#3399cc",
            },
        };

        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function(response) {
            alert(`Payment failed! Reason: ${response.error.reason}`);
        });
        rzp.open();
    })
    .catch((error) => {
        console.error("Error initiating payment:", error);
        alert("You need to login first!");
    });
}

function goToOrdersPage() {
    window.location.href = "/orders"; // Redirect to the orders page
}

