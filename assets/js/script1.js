// --- CONFIGURATION & CONSTANTS ---
const TMDB_IMG_BASE = "https://i0.wp.com/image.tmdb.org/t/p/w500";

// Using a self-executing anonymous function to avoid polluting the global scope
(() => {
  let wasOffline = !navigator.onLine;
  let player;

  // --- UTILITY FUNCTIONS ---

  const slugify = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
  };

  const getClientTitleForSlug = (item) => {
      const titlesToTry = [
          item.original_title,
          item.original_name,
          item.title,
          item.name
      ];
      for (const title of titlesToTry) {
          if (title) {
              const slug = slugify(title);
              if (slug) {
                  return title;
              }
          }
      }
      return `show-${item.id}`;
  };

  // --- DYNAMIC HTML GENERATORS ---

  function createGridItemHtml(item, lang) {
    const displayTitle = item.title || item.name;
    const year = (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
    const slug = slugify(getClientTitleForSlug(item));
    let itemUrl = item.media_type === 'tv' ? `/tv/${item.id}/${slug}` : `/movie/${item.id}/${slug}-${year}`;
    if (lang && lang !== 'en') {
        itemUrl += `?lang=${lang}`;
    }
    const posterUrl = item.poster_path ? `${TMDB_IMG_BASE}${item.poster_path}` : "no-image.svg";
    const rating = item.vote_average.toFixed(1);

    return `
      <div class="col-6 col-md-4 col-lg-2">
        <div class="card bg-transparent border-0 h-100 movie-card shadow-none">
          <a href="${itemUrl}" title="${displayTitle} (${year})" class="position-relative">
            <img src="preloader.svg" data-src="${posterUrl}" class="lazyload card-img-top rounded-3" alt="Poster for ${displayTitle}">
            <div class="card-img-overlay d-flex flex-column justify-content-end p-2">
              <div class="play-icon"><i class="fas fa-play-circle"></i></div>
            </div>
            <span class="badge bg-dark bg-opacity-75 position-absolute top-0 end-0 m-2">
              <i class="fas fa-star text-warning me-1"></i>${rating}
            </span>
          </a>
          <div class="card-body p-2 text-center">
            <div class="card-title text-truncate mb-0">
              <a href="${itemUrl}" title="${displayTitle} (${year})" class="link-body-emphasis text-decoration-none">${displayTitle}</a>
            </div>
            <small class="text-muted">${year}</small>
          </div>
        </div>
      </div>`;
  }

  function createRecommendationItemHtml(item, lang) {
    const displayTitle = item.title || item.name;
    const slug = slugify(getClientTitleForSlug(item));
    const year = (item.release_date || item.first_air_date) ? new Date(item.release_date || item.first_air_date).getFullYear() : 'N/A';
    const mediaType = item.media_type || 'movie';
    let itemUrl = mediaType === 'tv' ? `/tv/${item.id}/${slug}` : `/${mediaType}/${item.id}/${slug}-${year}`;
    if (lang && lang !== 'en') {
        itemUrl += `?lang=${lang}`;
    }
    const posterUrl = item.poster_path ? `${TMDB_IMG_BASE}${item.poster_path}` : "no-image.svg";

    return `
      <div class="d-flex mb-3">
        <div class="flex-shrink-0">
          <a href="${itemUrl}">
            <img src="preloader.svg" data-src="${posterUrl}" width="76" height="100%" class="lazyload faded rounded-3" alt="Poster for ${displayTitle}" title="${displayTitle}">
          </a>
        </div>
        <div class="ms-3">
          <div class="fs-6 mb-0">
            <a href="${itemUrl}" title="${displayTitle}" class="link-body-emphasis text-decoration-none">${displayTitle}</a>
          </div>
          <span class="text-muted">${year}</span>
          <div class="text-warning small"><i class="fas fa-star me-1"></i>${item.vote_average.toFixed(1)}</div>
        </div>
      </div>`;
  }

  // --- ASYNCHRONOUS DATA LOADERS ---

  async function loadRecommendations() {
      const listEl = document.getElementById('recommendations-list');
      const containerEl = document.getElementById('recommendations-container');
      if (!listEl || !containerEl) return;

      const url = new URL(window.location.href);
      const lang = url.searchParams.get('lang') || 'en';
      const pathname = url.pathname;
      const match = pathname.match(/\/(movie|tv)\/(\d+)/);
      if (!match) return;

      const [_, mediaType, mediaId] = match;

      try {
          const response = await fetch(`/api/recommendations/${mediaType}/${mediaId}?lang=${lang}`);
          if (!response.ok) throw new Error('Failed to fetch recommendations');
          const recommendations = await response.json();

          if (recommendations && recommendations.length > 0) {
              const itemsHtml = recommendations.map(item => createRecommendationItemHtml(item, lang)).join('');
              listEl.innerHTML = itemsHtml;
              listEl.classList.remove('text-center', 'py-5');
          } else {
              containerEl.style.display = 'none';
          }
      } catch (error) {
          console.error('Error loading recommendations:', error);
          containerEl.style.display = 'none';
      }
  }

  // --- INITIALIZATION FUNCTIONS ---

  function initializeBootstrapInContainer(container) {
    const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltips].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    const popovers = container.querySelectorAll('[data-bs-toggle="popover"]');
    [...popovers].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
  }

  function initializeThemeSwitcher() {
    const getStoredTheme = () => localStorage.getItem('theme');
    const getPreferredTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const applyTheme = (theme) => {
      const effectiveTheme = theme === 'auto' ? getPreferredTheme() : theme;
      document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
      const themeColor = effectiveTheme === 'dark' ? '#212529' : '#fbfbfb';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
      const lightIcon = document.getElementById('theme-icon-light');
      const darkIcon = document.getElementById('theme-icon-dark');
      if (lightIcon && darkIcon) {
        lightIcon.style.display = effectiveTheme === 'light' ? 'inline-block' : 'none';
        darkIcon.style.display = effectiveTheme === 'dark' ? 'inline-block' : 'none';
      }
    };
    applyTheme(getStoredTheme() || 'auto');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getStoredTheme() === 'auto' || !getStoredTheme()) applyTheme('auto');
    });
    document.getElementById('theme-toggler')?.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);
      applyTheme(newTheme);
    });
  }

  function initializeTextCollapse() {
    document.addEventListener('show.bs.collapse', (e) => {
      const link = document.querySelector(`a[href="#${e.target.id}"]`);
      if (link) {
        link.querySelector(".read-more")?.setAttribute('style', 'display: none;');
        link.querySelector(".read-less")?.setAttribute('style', 'display: inline;');
      }
    });
    document.addEventListener('hide.bs.collapse', (e) => {
      const link = document.querySelector(`a[href="#${e.target.id}"]`);
      if (link) {
        link.querySelector(".read-more")?.setAttribute('style', 'display: inline;');
        link.querySelector(".read-less")?.setAttribute('style', 'display: none;');
      }
    });
  }

  async function initializeGenreDropdown() {
    const dropdown = document.getElementById("genre-dropdown");
    if (!dropdown) return;
    try {
      const lang = new URL(window.location.href).searchParams.get('lang') || 'en';
      const response = await fetch(`/api/genres?lang=${lang}`);
      const genres = await response.json();
      if (genres && genres.length > 0) {
        const langParam = lang !== 'en' ? `?lang=${lang}` : '';
        dropdown.innerHTML = genres.map(genre => `<li><a class="dropdown-item" href="/genre/${genre.slug}${langParam}">${genre.name}</a></li>`).join("");
      } else {
        dropdown.innerHTML = '<li><a class="dropdown-item" href="#">No genres found</a></li>';
      }
    } catch (error) {
      console.error("Failed to load genres:", error);
      dropdown.innerHTML = '<li><a class="dropdown-item" href="#">Error loading genres</a></li>';
    }
  }

  function initializeInfiniteScroll() {
    const grid = document.querySelector(".movie-grid");
    if (!grid) return;

    const path = grid.dataset.path;
    const mediaType = grid.dataset.mediatype;

    if (!path && !mediaType) return;

    let currentPage = parseInt(grid.dataset.page) || 1;
    const totalPages = parseInt(grid.dataset.totalPages) || 1;
    if (currentPage >= totalPages) return;

    let isLoading = false;
    const loaderContainer = document.createElement("div");
    loaderContainer.id = "loader-container";
    loaderContainer.className = "col-12 text-center py-5";
    grid.parentNode.appendChild(loaderContainer);

    const loadMoreContent = async () => {
      if (isLoading || currentPage >= totalPages) return;
      isLoading = true;
      loaderContainer.innerHTML = `<div class="spinner-grow text-secondary" role="status"><span class="visually-hidden">Loading...</span></div>`;
      try {
        const nextUrl = new URL(window.location.origin);
        const currentUrlParams = new URLSearchParams(window.location.search);
        const lang = currentUrlParams.get('lang') || 'en';

        if (path && path.startsWith('/search')) {
          nextUrl.pathname = '/api/search';
          if (currentUrlParams.has("q")) nextUrl.searchParams.set("q", currentUrlParams.get("q"));
        } else if (mediaType) {
          nextUrl.pathname = '/api/list';
          const genreSlug = grid.dataset.genreSlug;
          nextUrl.searchParams.set("mediaType", mediaType);
          if (genreSlug) {
            nextUrl.searchParams.set("genre", genreSlug);
          }
        } else {
          isLoading = false;
          loaderContainer.innerHTML = '';
          return;
        }

        nextUrl.searchParams.set("page", currentPage + 1);
        if (lang !== 'en') nextUrl.searchParams.set("lang", lang);

        const response = await fetch(nextUrl.toString());
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const newHtml = data.results.map(item => createGridItemHtml(item, lang)).join('');
          grid.insertAdjacentHTML('beforeend', newHtml);
          currentPage++;
        } else {
          currentPage = totalPages;
        }
      } catch (error) {
        console.error("Failed to load more content:", error);
        currentPage = totalPages;
      } finally {
        isLoading = false;
        loaderContainer.innerHTML = currentPage >= totalPages ? "<p class='text-muted'>No more results.</p>" : "";
      }
    };
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreContent();
    }, {
      rootMargin: "200px"
    }).observe(loaderContainer);
  }

  async function initializeUserSignupNotifications() {
    const toastElement = document.getElementById("user-signup-notification");
    if (!toastElement) return;
    const toast = bootstrap.Toast.getOrCreateInstance(toastElement, {
      delay: 6000
    });
    const messageElement = document.getElementById("user-signup-message");
    try {
      const lang = new URL(window.location.href).searchParams.get('lang') || 'en';
      const response = await fetch(`/api/user?lang=${lang}`);
      const data = await response.json();
      if (!data.notifications || data.notifications.length === 0) return;
      const showRandomToast = () => {
        const randomNotification = data.notifications[Math.floor(Math.random() * data.notifications.length)];
        if (!randomNotification) return;
        messageElement.innerHTML = randomNotification.messageContent;
        toast.show();
        setTimeout(showRandomToast, Math.random() * 12000 + 12000);
      };
      setTimeout(showRandomToast, 6000);
    } catch (error) {
      console.error("Failed to fetch data for user signups:", error);
    }
  }

  function showStatusToast(message, isStillOffline = false) {
    const statusToastEl = document.getElementById("status-toast");
    if (!statusToastEl) return;
    const toast = bootstrap.Toast.getOrCreateInstance(statusToastEl, {
      autohide: !isStillOffline,
      delay: 5000
    });
    const toastBody = statusToastEl.querySelector(".toast-body");
    toastBody.textContent = message;
    statusToastEl.classList.remove('text-bg-success', 'text-bg-danger', 'still-offline');
    const btnClose = statusToastEl.querySelector('.btn-close');
    if (isStillOffline) {
      statusToastEl.classList.add('still-offline');
      if (btnClose) btnClose.classList.add('btn-close-white');
    } else if (navigator.onLine) {
      statusToastEl.classList.add('text-bg-success', 'text-white');
      if (btnClose) btnClose.classList.add('btn-close-white');
    } else {
      statusToastEl.classList.add('text-bg-danger', 'text-white');
      if (btnClose) btnClose.classList.add('btn-close-white');
    }
    toast.show();
  }

  function initializeOnlineStatusHandler() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      if (isOnline) {
        if (wasOffline) {
          showStatusToast("You are back online!");
        }
      } else {
        showStatusToast("You are currently offline.");
      }
      wasOffline = !isOnline;
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  }

  function initializePWA() {
    const installBanner = document.getElementById("install-banner");
    const installButton = document.getElementById("install-button");
    const closeButton = document.getElementById("close-install-button");
    if (!installBanner || !installButton || !closeButton || localStorage.getItem("pwaInstallDismissed") === "true") {
      return;
    }
    const showBanner = () => {
      installBanner.classList.remove("d-none");
      setTimeout(() => installBanner.classList.add("show"), 50);
    };
    const hideBanner = (isPermanent = false) => {
      if (isPermanent) {
        localStorage.setItem("pwaInstallDismissed", "true");
      }
      installBanner.classList.remove("show");
      installBanner.addEventListener('transitionend', () => installBanner.classList.add('d-none'), {
        once: true
      });
    };
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      const deferredPrompt = e;
      showBanner();
      installButton.addEventListener("click", () => {
        hideBanner(true);
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            setTimeout(() => {
              showStatusToast("App installed! Check your home screen to open it.");
            }, 1000);
          }
        });
      }, {
        once: true
      });
    });
    closeButton.addEventListener("click", () => {
      hideBanner(true);
    });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
        if (!navigator.onLine) {
          showStatusToast("You're still offline.", true);
        }
      });
    }
  }

  function initializeYoutubePlayer() {
    if (player) return;
    const playerDiv = document.getElementById('player');
    if (playerDiv) {
      const videoId = playerDiv.dataset.videoid;
      if (videoId) {
        player = new YT.Player('player', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            'autoplay': 0,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
          },
          events: {
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady
          }
        });
      }
    }
  }

  window.onYouTubeIframeAPIReady = function() {
    initializeYoutubePlayer();
  };

  function onPlayerReady(event) {}

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      triggerModalSequence();
    }
  }

  const triggerModalSequence = () => {
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;

    const posterUrl = videoContainer.dataset.posterurl;
    const backdropUrl = videoContainer.dataset.backdropurl;
    const title = videoContainer.dataset.title;
    const imageUrl = backdropUrl && !backdropUrl.includes('no-image.svg') ? backdropUrl : posterUrl;

    if (player && typeof player.destroy === 'function') {
      player.destroy();
      player = null;
    }

    videoContainer.innerHTML = `
      <img src="${imageUrl}" class="lazyload img-fluid w-100" style="object-fit: cover; height: 100%;" alt="Backdrop for ${title}">
      <div class="video-overlay">
          <a href="javascript:void(0)" class="replay-icon" aria-label="Signup">
              <i class="fa fa-play"></i>
          </a>
      </div>`;

    videoContainer.querySelector('.replay-icon').addEventListener('click', showSignupModal);
    showSignupModal();
  };

  window.showSignupModal = () => {
    const modalElement = document.getElementById('signupModal');
    if (!modalElement) return;
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance && modalInstance._isShown) return;
    const modalContent = modalElement.querySelector('.modal-content');
    if (modalContent) modalContent.classList.add('has-bg');
    const modal = modalInstance || new bootstrap.Modal(modalElement);
    modal.show();
    modalElement.addEventListener('hidden.bs.modal', () => {
      if (modalContent) modalContent.classList.remove('has-bg');
    }, {
      once: true
    });
  };

  window.startPlayback = (videoUrl) => {
    const videoContainer = document.getElementById('video-container');
    if (videoContainer) {
      if (player && typeof player.destroy === 'function') {
        player.destroy();
        player = null;
      }
      videoContainer.innerHTML = `<iframe id="myVideo" class="loading" src="${videoUrl}" allowfullscreen></iframe>`;
      setTimeout(() => {
        if (!document.fullscreenElement) showSignupModal();
      }, 90000);
    }
  };

  // --- MAIN EXECUTION ---

  document.addEventListener("DOMContentLoaded", () => {
    initializeThemeSwitcher();
    initializeBootstrapInContainer(document.body);
    initializeGenreDropdown();
    initializeTextCollapse();
    initializeInfiniteScroll();
    initializePWA();
    initializeOnlineStatusHandler();
    loadRecommendations();
    if (typeof YT !== 'undefined' && YT.Player) {
      initializeYoutubePlayer();
    }
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) initializeBootstrapInContainer(node);
          });
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    if (document.body.dataset.signupEnabled === 'true') {
      requestIdleCallback(() => setTimeout(initializeUserSignupNotifications, 6000), {
        timeout: 4000
      });
    }
  });

})();
