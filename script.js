// Google Books API configuration
const API_URL = 'https://www.googleapis.com/books/v1/volumes';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const myLibrary = document.getElementById('myLibrary');
const recommendedBooks = document.getElementById('recommendedBooks');
const modal = document.getElementById('bookModal');
const closeModal = document.getElementsByClassName('close')[0];
const filterShelf = document.getElementById('filterShelf');
const genreButtons = document.querySelectorAll('.genre-btn');
const addToLibraryBtn = document.getElementById('addToLibrary');
const shelfSelect = document.getElementById('shelfSelect');
const readingProgress = document.getElementById('readingProgress');
const progressValue = document.getElementById('progressValue');

let currentBook = null;

// Library Management
class Library {
    constructor() {
        this.books = JSON.parse(localStorage.getItem('library')) || [];
    }

    addBook(book, shelf) {
        const newBook = {
            ...book,
            id: Date.now().toString(),
            shelf: shelf,
            progress: 0
        };
        this.books.push(newBook);
        this.saveToLocalStorage();
        return newBook;
    }

    removeBook(bookId) {
        this.books = this.books.filter(book => book.id !== bookId);
        this.saveToLocalStorage();
    }

    updateProgress(bookId, progress) {
        const book = this.books.find(book => book.id === bookId);
        if (book) {
            book.progress = progress;
            this.saveToLocalStorage();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('library', JSON.stringify(this.books));
    }

    getBooksByShelf(shelf) {
        return shelf === 'all' 
            ? this.books 
            : this.books.filter(book => book.shelf === shelf);
    }
}

const library = new Library();

// Event Listeners
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    currentBook = null;
});
filterShelf.addEventListener('change', (e) => displayLibrary(e.target.value));
genreButtons.forEach(button => {
    button.addEventListener('click', () => {
        getRecommendations(button.dataset.genre);
        genreButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

addToLibraryBtn.addEventListener('click', () => {
    if (currentBook) {
        const shelf = shelfSelect.value;
        const newBook = library.addBook(currentBook, shelf);
        displayLibrary(filterShelf.value);
        modal.style.display = 'none';
        currentBook = null;
    }
});

readingProgress.addEventListener('input', (e) => {
    if (currentBook && currentBook.id) {
        const progress = parseInt(e.target.value);
        progressValue.textContent = `${progress}%`;
        library.updateProgress(currentBook.id, progress);
        displayLibrary(filterShelf.value);
    }
});

// Search functionality
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        recommendedBooks.innerHTML = '<p class="no-results">Searching...</p>';
        const response = await fetch(`${API_URL}?q=${encodeURIComponent(query)}&maxResults=10`);
        if (!response.ok) {
            throw new Error('Failed to fetch search results');
        }
        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
            displaySearchResults(data.items);
        } else {
            recommendedBooks.innerHTML = '<p class="no-results">No books found. Try a different search term.</p>';
        }
    } catch (error) {
        console.error('Error searching books:', error);
        recommendedBooks.innerHTML = '<p class="error-message">Failed to load search results. Please try again later.</p>';
    }
}

// Display Functions
function displaySearchResults(books) {
    recommendedBooks.innerHTML = '';
    if (!books || books.length === 0) {
        recommendedBooks.innerHTML = '<p class="no-results">No books found.</p>';
        return;
    }
    books.forEach(book => {
        const bookCard = createBookCard(book);
        recommendedBooks.appendChild(bookCard);
    });
}

function displayLibrary(shelf = 'all') {
    myLibrary.innerHTML = '';
    const books = library.getBooksByShelf(shelf);
    if (books.length === 0) {
        myLibrary.innerHTML = '<p class="no-results">No books in this shelf yet.</p>';
        return;
    }
    books.forEach(book => {
        const bookCard = createBookCard(book, true);
        myLibrary.appendChild(bookCard);
    });
}

function createBookCard(book, isLibraryBook = false) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const volumeInfo = book.volumeInfo || book;
    const thumbnail = volumeInfo.imageLinks?.thumbnail || 
                     'https://via.placeholder.com/128x192.png?text=No+Cover';

    card.innerHTML = `
        <img src="${thumbnail}" alt="${volumeInfo.title}" onerror="this.src='https://via.placeholder.com/128x192.png?text=No+Cover'">
        <h3>${volumeInfo.title || 'Untitled'}</h3>
        <p>${volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author'}</p>
        ${isLibraryBook ? `<p>Progress: ${book.progress || 0}%</p>` : ''}
    `;

    card.addEventListener('click', () => showBookDetails(book, isLibraryBook));
    return card;
}

function showBookDetails(book, isLibraryBook) {
    currentBook = book;
    const volumeInfo = book.volumeInfo || book;
    const bookDetails = document.getElementById('bookDetails');
    
    bookDetails.innerHTML = `
        <h2>${volumeInfo.title || 'Untitled'}</h2>
        <p><strong>Author(s):</strong> ${volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown'}</p>
        <p><strong>Description:</strong> ${volumeInfo.description || 'No description available'}</p>
        <p><strong>Published:</strong> ${volumeInfo.publishedDate || 'Unknown'}</p>
    `;

    if (isLibraryBook) {
        addToLibraryBtn.style.display = 'none';
        readingProgress.value = book.progress || 0;
        progressValue.textContent = `${book.progress || 0}%`;
        document.querySelector('.progress-tracker').style.display = 'block';
    } else {
        addToLibraryBtn.style.display = 'inline-block';
        document.querySelector('.progress-tracker').style.display = 'none';
    }

    modal.style.display = 'block';
}

// Recommendations
async function getRecommendations(genre) {
    try {
        recommendedBooks.innerHTML = '<p class="no-results">Loading recommendations...</p>';
        const response = await fetch(`${API_URL}?q=subject:${encodeURIComponent(genre)}&maxResults=10`);
        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }
        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
            displaySearchResults(data.items);
        } else {
            recommendedBooks.innerHTML = '<p class="no-results">No recommendations found for this genre.</p>';
        }
    } catch (error) {
        console.error('Error getting recommendations:', error);
        recommendedBooks.innerHTML = '<p class="error-message">Failed to load recommendations. Please try again later.</p>';
    }
}

// Initial load
displayLibrary();
getRecommendations('fiction');