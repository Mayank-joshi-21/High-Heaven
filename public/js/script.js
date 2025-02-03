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

    // Validate the amount
    if (isNaN(amount) || amount <= 0) {
        alert("Invalid price. Please try again.");
        return;
    }

    // Create order on the server
    fetch("/create-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
    })
        .then((response) => response.json())
        .then((data) => {
            const options = {
                key: "rzp_test_exhA8WM645dgvm", // Replace with your Razorpay key ID
                amount: amount * 100, // Convert to the smallest currency unit
                currency: "INR",
                name: "High Heaven",
                description: "Room Reservation",
                order_id: data.orderId, // Razorpay order ID
                handler: function (response) {
                    alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
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
            rzp.on("payment.failed", function (response) {
                alert(`Payment failed! Reason: ${response.error.reason}`);
            });
            rzp.open();
        })
        .catch((error) => {
            console.error("Error initiating payment:", error);
            alert("Something went wrong!");
        });
}