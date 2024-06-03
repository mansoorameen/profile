const navToggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".links");

navToggle.addEventListener("click", function () {
  links.classList.toggle("show-links");
});

// Get the current page URL
var currentPage = window.location.pathname;

// Loop through each link and check if its href matches the current page URL
links.forEach(function (link) {
  if (link.getAttribute("href") === currentPage) {
    // Add link-active class to the current page link
    link.classList.add("link-active");
  }
});
