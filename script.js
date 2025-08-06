document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
    }

    // Check for search parameter in URL and perform search if present
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    if (searchTerm) {
        // Set the search input values
        const searchInput = document.getElementById('search-input');
        const mobileSearchInput = document.getElementById('mobile-search-input');
        
        if (searchInput) searchInput.value = searchTerm;
        if (mobileSearchInput) mobileSearchInput.value = searchTerm;
        
        // Perform search after a short delay to ensure DOM is fully loaded
        setTimeout(() => {
            performSearch(searchTerm);
        }, 100);
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    
    // Function to perform search
        function performSearch(searchTerm) {
            // Check if we're on the index page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                // Redirect to newsarchive.html with search term as query parameter
                if (searchTerm.trim() !== '') {
                    window.location.href = `newsarchive.html?search=${encodeURIComponent(searchTerm)}`;
                }
                return;
            }
            
            // Check if we're on a news archive page or blog post page
                        const articlesContainer = document.querySelector('.articles');
                        const blogContainer = document.querySelector('.blog-content');
                        
                        if (articlesContainer) {
                            // News archive page search
                            const articles = document.querySelectorAll('.article-small');
                            const searchTermLower = searchTerm.toLowerCase();
                            
                            articles.forEach(article => {
                                const title = article.querySelector('h3').textContent.toLowerCase();
                                const category = article.querySelector('.category') ? article.querySelector('.category').textContent.toLowerCase() : '';
                                
                                if (searchTerm === '' || title.includes(searchTermLower) || category.includes(searchTermLower)) {
                                    // Show the article
                                    if (article.parentElement.classList.contains('article-featured')) {
                                        // For featured articles, show the parent container
                                        article.parentElement.style.display = 'block';
                                    } else {
                                        // For grid articles, show the article itself
                                        article.style.display = 'block';
                                    }
                                } else {
                                    // Hide the article
                                    if (article.parentElement.classList.contains('article-featured')) {
                                        // For featured articles, hide the parent container
                                        article.parentElement.style.display = 'none';
                                    } else {
                                        // For grid articles, hide the article itself
                                        article.style.display = 'none';
                                    }
                                }
                            });
                        } else if (blogContainer) {
                            // Blog post page search
                            const searchTermLower = searchTerm.toLowerCase();
                            
                            // Get all searchable elements in the blog content
                            const searchableElements = blogContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li');
                            let foundMatch = false;
                            
                            // Check if any searchable element contains the search term
                            searchableElements.forEach(element => {
                                const text = element.textContent.toLowerCase();
                                if (searchTerm === '' || text.includes(searchTermLower)) {
                                    foundMatch = true;
                                    element.style.backgroundColor = searchTerm !== '' ? 'yellow' : ''; // Highlight matches
                                } else {
                                    element.style.backgroundColor = ''; // Remove highlight if not matching
                                }
                            });
                            
                            // If no matches found and search term is not empty, show a message
                            const noResultsMessage = document.getElementById('no-results-message');
                            if (searchTerm !== '' && !foundMatch) {
                                if (!noResultsMessage) {
                                    const message = document.createElement('p');
                                    message.id = 'no-results-message';
                                    message.textContent = 'No results found for: ' + searchTerm;
                                    message.style.color = 'red';
                                    message.style.fontWeight = 'bold';
                                    message.style.marginTop = '20px';
                                    blogContainer.appendChild(message);
                                } else {
                                    noResultsMessage.textContent = 'No results found for: ' + searchTerm;
                                    noResultsMessage.style.display = 'block';
                                }
                            } else if (noResultsMessage) {
                                noResultsMessage.style.display = 'none';
                            }
                        }
        }
    
        // Add event listeners for search button clicks and Enter key
        if (searchInput) {
            // Search on button click
            const searchButton = document.getElementById('search-button');
            if (searchButton) {
                searchButton.addEventListener('click', function() {
                    performSearch(searchInput.value);
                });
            }
            
            // Search on Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(this.value);
                }
            });
        }
        
        if (mobileSearchInput) {
            // Search on button click
            const mobileSearchButton = document.getElementById('mobile-search-button');
            if (mobileSearchButton) {
                mobileSearchButton.addEventListener('click', function() {
                    performSearch(mobileSearchInput.value);
                });
            }
            
            // Search on Enter key
            mobileSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(this.value);
                }
            });
        }
    
});