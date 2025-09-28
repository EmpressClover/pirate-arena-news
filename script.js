document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const pageType = body ? body.dataset.page : '';

    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const searchTermFromUrl = urlParams.get('search') || '';

    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchButton = document.getElementById('mobile-search-button');

    if (searchInput && searchTermFromUrl) {
        searchInput.value = searchTermFromUrl;
    }

    if (mobileSearchInput && searchTermFromUrl) {
        mobileSearchInput.value = searchTermFromUrl;
    }

    const postsCache = new Map();

    const escapeHtml = (value = '') => value
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const escapeAttribute = (value = '') => escapeHtml(value).replace(/`/g, '&#96;');

    const fetchPosts = async (options = {}) => {
        const limit = typeof options.limit === 'number' ? options.limit : undefined;
        const useLimit = Number.isFinite(limit) && limit > 0;
        const cacheKey = useLimit ? `limit:${limit}` : 'all';

        if (postsCache.has(cacheKey)) {
            return postsCache.get(cacheKey);
        }

        const url = useLimit ? `/api/posts?limit=${encodeURIComponent(limit)}` : '/api/posts';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error((data && data.error) ? data.error : 'Unexpected posts payload');
        }

        postsCache.set(cacheKey, data);
        return data;
    };

    const formatDisplayDate = (post) => {
        if (post.displayDate) {
            return post.displayDate;
        }
        if (!post.publishedAt) {
            return '';
        }
        const timestamp = new Date(post.publishedAt);
        if (Number.isNaN(timestamp.getTime())) {
            return post.publishedAt;
        }
        return timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const createArticleCard = (post, options = {}) => {
        const { featured = false } = options;
        const link = document.createElement('a');
        link.href = `/post.html?slug=${encodeURIComponent(post.slug)}`;
        link.classList.add('article-link');

        const card = document.createElement('div');
        card.classList.add('article-small');
        if (featured) {
            card.classList.add('article-small-featured');
        }

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('article-image-container');

        if (post.thumbnailUrl) {
            const image = document.createElement('img');
            image.src = post.thumbnailUrl;
            image.alt = post.title ? `${post.title} thumbnail` : 'News thumbnail';
            image.loading = 'lazy';
            imageContainer.appendChild(image);
        } else {
            imageContainer.classList.add('article-image-placeholder');
            const placeholder = document.createElement('div');
            placeholder.classList.add('article-image-fallback');
            placeholder.textContent = 'Pirate Arena';
            imageContainer.appendChild(placeholder);
        }

        const categoryBadge = document.createElement('span');
        categoryBadge.classList.add('category');
        categoryBadge.textContent = post.category || 'News';

        const dateBadge = document.createElement('span');
        dateBadge.classList.add('date');
        dateBadge.textContent = formatDisplayDate(post);

        imageContainer.appendChild(categoryBadge);
        imageContainer.appendChild(dateBadge);

        const title = document.createElement('h3');
        title.textContent = post.title || 'Untitled Post';

        card.appendChild(imageContainer);
        card.appendChild(title);

        if (post.summary) {
            const summary = document.createElement('p');
            summary.classList.add('article-summary');
            summary.textContent = post.summary;
            card.appendChild(summary);
        }

        link.appendChild(card);
        return link;
    };

    const showEmptyState = (element, shouldShow) => {
        if (!element) {
            return;
        }
        if (shouldShow) {
            element.removeAttribute('hidden');
        } else {
            element.setAttribute('hidden', 'hidden');
        }
    };

    const renderIndex = (posts) => {
        const featuredContainer = document.getElementById('featured-posts');
        const recentContainer = document.getElementById('recent-posts');
        const emptyState = document.getElementById('index-empty-state');

        if (!featuredContainer || !recentContainer) {
            return;
        }

        featuredContainer.innerHTML = '';
        recentContainer.innerHTML = '';
        showEmptyState(emptyState, false);

        if (!posts.length) {
            showEmptyState(emptyState, true);
            return;
        }

        const [latest, ...others] = posts;
        featuredContainer.appendChild(createArticleCard(latest, { featured: true }));
        others.forEach((post) => {
            recentContainer.appendChild(createArticleCard(post));
        });
    };

    const renderArchive = (posts) => {
        const featuredContainer = document.getElementById('archive-featured');
        const gridContainer = document.getElementById('archive-posts');
        const emptyState = document.getElementById('archive-empty-state');

        if (!featuredContainer || !gridContainer) {
            return;
        }

        featuredContainer.innerHTML = '';
        gridContainer.innerHTML = '';
        showEmptyState(emptyState, false);

        const list = Array.isArray(posts) ? posts : [];

        if (!list.length) {
            showEmptyState(emptyState, true);
            return;
        }

        const [latest, ...others] = list;
        featuredContainer.appendChild(createArticleCard(latest, { featured: true }));

        const archivePosts = others.length ? others : [];
        archivePosts.forEach((post) => {
            gridContainer.appendChild(createArticleCard(post));
        });
    };

    const renderPostDetail = (posts) => {
        const loadingEl = document.getElementById('post-loading');
        const errorEl = document.getElementById('post-error');
        const headerMediaEl = document.getElementById('post-header-media');
        const metaEl = document.getElementById('post-meta');
        const categoryEl = document.getElementById('post-category');
        const dateEl = document.getElementById('post-date');
        const titleEl = document.getElementById('post-title');
        const bodyEl = document.getElementById('post-body');

        if (loadingEl) {
            loadingEl.style.display = 'none';
        }

        const slugFromQuery = urlParams.get('slug');
        const pathSlug = window.location.pathname
            .replace(/^\//, '')
            .replace(/\/$/, '')
            .replace(/\.html$/, '');

        let slug = slugFromQuery;
        if (!slug && pathSlug && !['index', 'newsarchive', 'post', 'post.html', 'create-post', 'api'].includes(pathSlug)) {
            slug = pathSlug;
        }

        if (!slug) {
            if (errorEl) {
                errorEl.removeAttribute('hidden');
            }
            return;
        }

        const list = Array.isArray(posts) ? posts : [];
        const post = list.find((item) => item.slug === slug);

        if (!post) {
            if (errorEl) {
                errorEl.removeAttribute('hidden');
            }
            return;
        }

        if (headerMediaEl) {
            headerMediaEl.innerHTML = '';
            if (post.headerImageUrl) {
                const image = document.createElement('img');
                image.src = post.headerImageUrl;
                image.alt = post.title ? `${post.title} header image` : 'Post header image';
                headerMediaEl.appendChild(image);
                headerMediaEl.removeAttribute('hidden');
            } else {
                headerMediaEl.setAttribute('hidden', 'hidden');
            }
        }

        if (metaEl) {
            if (categoryEl) {
                categoryEl.textContent = post.category || 'News';
            }
            if (dateEl) {
                dateEl.textContent = formatDisplayDate(post);
            }
            metaEl.removeAttribute('hidden');
        }

        if (titleEl) {
            titleEl.textContent = post.title || 'Untitled Post';
            titleEl.removeAttribute('hidden');
        }

        if (bodyEl) {
            bodyEl.innerHTML = post.content || '<p>This post does not have any content yet.</p>';
            bodyEl.removeAttribute('hidden');
        }

        document.title = post.title ? `${post.title} - Pirate Arena News` : 'Pirate Arena News Post';
    };

    const handlePostsError = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) {
            return;
        }
        const message = document.createElement('p');
        message.classList.add('posts-error');
        message.textContent = 'We ran into a problem loading posts. Please try refreshing the page.';
        container.innerHTML = '';
        container.appendChild(message);
    };

    const initCreatePostPage = () => {
        const form = document.getElementById('create-post-form');
        if (!form) {
            return;
        }

        const passwordInput = document.getElementById('post-password');
        const titleInput = document.getElementById('post-title');
        const slugInput = document.getElementById('post-slug');
        const categoryInput = document.getElementById('post-category');
        const displayDateInput = document.getElementById('post-display-date');
        const publishedAtInput = document.getElementById('post-published-at');
        const thumbnailInput = document.getElementById('post-thumbnail');
        const headerImageInput = document.getElementById('post-header-image');
        const summaryInput = document.getElementById('post-summary');
        const editor = document.getElementById('post-content-editor');
        const plainTextarea = document.getElementById('post-content-plain');
        const contentInput = document.getElementById('post-content');
        const previewContainer = document.getElementById('preview-container');
        const previewBody = document.getElementById('preview-body');
        const tocButton = document.getElementById('toc-btn');
        const clearButton = document.getElementById('clear-btn');
        const feedback = document.getElementById('form-feedback');
        const submitButton = form.querySelector('button[type="submit"]');
        const toolbar = document.getElementById('editor-toolbar');
        const modeButtons = Array.from(document.querySelectorAll('.editor-mode-button'));
        const formattingControls = toolbar ? Array.from(toolbar.querySelectorAll('.editor-control[data-editor-command], .editor-control[data-editor-insert]')) : [];
        let editorMode = 'rich';

        const setFeedback = (message, type = 'info', options = {}) => {
            if (!feedback) {
                return;
            }
            feedback.className = 'form-feedback';
            if (!message) {
                feedback.textContent = '';
                return;
            }
            feedback.classList.add(`form-feedback--${type}`);
            if (options.html) {
                feedback.innerHTML = message;
            } else {
                feedback.textContent = message;
            }
        };

        const updateHiddenContent = (overrideHtml) => {
            let html;
            if (typeof overrideHtml === 'string') {
                html = overrideHtml;
            } else if (editorMode === 'plain' && plainTextarea) {
                html = plainTextarea.value;
            } else if (editor) {
                html = editor.innerHTML;
            } else {
                html = '';
            }
            const normalized = typeof html === 'string' ? html.trim() : '';
            if (contentInput) {
                contentInput.value = normalized;
            }
            return normalized;
        };

        const resetPreview = () => {
            if (previewContainer) {
                previewContainer.setAttribute('hidden', 'hidden');
            }
            if (previewBody) {
                previewBody.innerHTML = '';
            }
        };

        const isContentEmpty = (html) => {
            if (!html) {
                return true;
            }
            if (editorMode === 'plain') {
                return !html.trim();
            }
            const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            return !stripped;
        };

        const updatePreview = () => {
            if (!previewContainer || !previewBody) {
                return;
            }
            const content = updateHiddenContent();
            if (isContentEmpty(content)) {
                resetPreview();
                return;
            }
            previewBody.innerHTML = content;
            previewContainer.removeAttribute('hidden');
        };

        const insertHtmlAtCursor = (html) => {
            if (!html) {
                return;
            }
            if (editorMode === 'plain' && plainTextarea) {
                const textarea = plainTextarea;
                const start = typeof textarea.selectionStart === 'number' ? textarea.selectionStart : textarea.value.length;
                const end = typeof textarea.selectionEnd === 'number' ? textarea.selectionEnd : textarea.value.length;
                const before = textarea.value.slice(0, start);
                const after = textarea.value.slice(end);
                textarea.value = `${before}${html}${after}`;
                const cursor = start + html.length;
                textarea.selectionStart = cursor;
                textarea.selectionEnd = cursor;
                textarea.focus();
                updateHiddenContent();
                updatePreview();
                return;
            }
            if (!editor) {
                return;
            }
            editor.focus();
            if (document.queryCommandSupported('insertHTML')) {
                document.execCommand('insertHTML', false, html);
            } else {
                const selection = window.getSelection ? window.getSelection() : null;
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    const temp = document.createElement('div');
                    temp.innerHTML = html;
                    const fragment = document.createDocumentFragment();
                    let node;
                    while ((node = temp.firstChild)) {
                        fragment.appendChild(node);
                    }
                    range.insertNode(fragment);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    editor.innerHTML += html;
                }
            }
            updateHiddenContent();
            updatePreview();
        };

        const applyModeButtonStyles = () => {
            modeButtons.forEach((button) => {
                const modeValue = button.dataset.editorMode === 'plain' ? 'plain' : 'rich';
                const isActive = modeValue === editorMode;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        };

        const toggleFormattingControls = (mode) => {
            if (!formattingControls.length) {
                return;
            }
            const disable = mode === 'plain';
            formattingControls.forEach((control) => {
                if (control.id === 'clear-btn') {
                    return;
                }
                control.disabled = disable;
            });
        };

        const setEditorMode = (mode, options = {}) => {
            const normalized = mode === 'plain' ? 'plain' : 'rich';
            if (normalized === editorMode && !options.force) {
                applyModeButtonStyles();
                toggleFormattingControls(editorMode);
                return;
            }

            const currentHtml = updateHiddenContent();

            if (normalized === 'plain') {
                if (plainTextarea) {
                    plainTextarea.value = currentHtml;
                    plainTextarea.removeAttribute('hidden');
                }
                if (editor) {
                    editor.setAttribute('hidden', 'hidden');
                }
            } else {
                if (editor) {
                    editor.innerHTML = currentHtml;
                    editor.removeAttribute('hidden');
                }
                if (plainTextarea) {
                    plainTextarea.setAttribute('hidden', 'hidden');
                }
            }

            editorMode = normalized;
            applyModeButtonStyles();
            toggleFormattingControls(editorMode);
            updateHiddenContent();
            updatePreview();
        };

        if (modeButtons.length) {
            modeButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    const targetMode = button.dataset.editorMode === 'plain' ? 'plain' : 'rich';
                    setEditorMode(targetMode);
                });
            });
        }

        if (editor) {
            editor.addEventListener('input', () => {
                if (editorMode !== 'rich') {
                    return;
                }
                updateHiddenContent();
                updatePreview();
            });
        }

        if (plainTextarea) {
            plainTextarea.addEventListener('input', () => {
                if (editorMode !== 'plain') {
                    return;
                }
                updateHiddenContent();
                updatePreview();
            });
        }

        if (toolbar) {
            toolbar.addEventListener('click', (event) => {
                const control = event.target.closest('.editor-control');
                if (!control) {
                    return;
                }
                event.preventDefault();

                const command = control.dataset.editorCommand;
                const insertType = control.dataset.editorInsert;

                if (editorMode === 'plain' && control.id !== 'clear-btn') {
                    return;
                }

                if (command && editor) {
                    editor.focus();
                    document.execCommand(command, false, null);
                    updateHiddenContent();
                    updatePreview();
                    return;
                }

                if (insertType === 'image') {
                    const url = window.prompt('Image URL');
                    if (!url) {
                        return;
                    }
                    const alt = window.prompt('Image alt text (optional)', '') || '';
                    const sanitizedUrl = url.trim();
                    if (!sanitizedUrl) {
                        return;
                    }
                    const figureHtml = `<figure><img src="${escapeAttribute(sanitizedUrl)}" alt="${escapeAttribute(alt)}"></figure>`;
                    insertHtmlAtCursor(figureHtml);
                    return;
                }

                if (insertType === 'video') {
                    const url = window.prompt('Video URL or embed link');
                    if (!url) {
                        return;
                    }
                    const sanitizedUrl = url.trim();
                    if (!sanitizedUrl) {
                        return;
                    }

                    let embedHtml = '';
                    const youtubeMatch = sanitizedUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
                    if (youtubeMatch) {
                        embedHtml = `<div class="embedded-video"><iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
                    } else if (/\.mp4($|\?)/i.test(sanitizedUrl)) {
                        embedHtml = `<video controls src="${sanitizedUrl}"></video>`;
                    } else {
                        embedHtml = `<div class="embedded-video"><iframe src="${sanitizedUrl}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
                    }
                    insertHtmlAtCursor(embedHtml);
                }
            });
        }

        if (tocButton) {
            tocButton.addEventListener('click', (event) => {
                event.preventDefault();
                const tocTemplate = `<div class="table-of-contents">\n  <h2>Table of Contents</h2>\n  <ul>\n    <li><a href="#section-1">Section 1</a></li>\n    <li><a href="#section-2">Section 2</a></li>\n    <li><a href="#section-3">Section 3</a></li>\n  </ul>\n</div>\n\n`;
                insertHtmlAtCursor(tocTemplate);
            });
        }

        const balanceBuilder = document.getElementById('balance-builder');
        if (balanceBuilder) {
            const balanceCharacterNameInput = document.getElementById('balance-character-name');
            const balanceCharacterSubtitleInput = document.getElementById('balance-character-subtitle');
            const balanceCharacterImageInput = document.getElementById('balance-character-image');
            const balanceSectionTitleInput = document.getElementById('balance-section-title');
            const balanceStatOneValueInput = document.getElementById('balance-stat-one-value');
            const balanceStatOneLabelInput = document.getElementById('balance-stat-one-label');
            const balanceStatTwoValueInput = document.getElementById('balance-stat-two-value');
            const balanceStatTwoLabelInput = document.getElementById('balance-stat-two-label');
            const balanceAbilitiesList = document.getElementById('balance-abilities-list');
            const balanceAddAbilityButton = document.getElementById('add-balance-ability');
            const balanceInsertButton = document.getElementById('insert-balance-section');
            const balanceFeedback = document.getElementById('balance-feedback');

            if (!balanceAbilitiesList || !balanceAddAbilityButton || !balanceInsertButton) {
                console.warn('Balance builder markup is missing required elements.');
                return;
            }

            const focusBalanceBuilder = () => {
                balanceBuilder.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };

            const setBalanceFeedback = (message = '', type = 'info') => {
                if (!balanceFeedback) {
                    return;
                }
                balanceFeedback.className = 'form-feedback';
                if (!message) {
                    balanceFeedback.textContent = '';
                    return;
                }
                balanceFeedback.classList.add(`form-feedback--${type}`);
                balanceFeedback.textContent = message;
            };

            let abilityRowCounter = 0;

            const updateRemoveAbilityButtons = () => {
                const rows = Array.from(balanceAbilitiesList.querySelectorAll('.balance-ability-row'));
                const shouldDisable = rows.length <= 1;
                rows.forEach((row) => {
                    const removeButton = row.querySelector('.balance-remove-ability');
                    if (removeButton) {
                        removeButton.disabled = shouldDisable;
                    }
                });
            };

            const createAbilityRow = (initialData = {}) => {
                abilityRowCounter += 1;
                const row = document.createElement('div');
                row.className = 'balance-ability-row';
                row.dataset.balanceAbilityId = String(abilityRowCounter);
                row.innerHTML = `
                    <div class="form-group">
                        <label>Ability Name *</label>
                        <input type="text" class="balance-ability-name" placeholder="Water Needles">
                    </div>
                    <div class="form-group">
                        <label>Ability Image URL</label>
                        <input type="url" class="balance-ability-image" placeholder="https://">
                    </div>
                    <div class="form-group balance-highlight-group">
                        <label>Highlight Type</label>
                        <select class="balance-ability-highlight-type">
                            <option value="none">None</option>
                            <option value="damage">Damage</option>
                            <option value="effect">Effect</option>
                            <option value="defense">Defense</option>
                            <option value="support">Support</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Highlight Text</label>
                        <input type="text" class="balance-ability-highlight-text" placeholder="10 additional damage">
                    </div>
                    <div class="form-group balance-ability-description-group">
                        <label>Ability Description *</label>
                        <textarea rows="3" class="balance-ability-description" placeholder="Describe the balance change..."></textarea>
                    </div>
                    <button type="button" class="balance-remove-ability" aria-label="Remove ability">Remove</button>
                `;

                const removeButton = row.querySelector('.balance-remove-ability');
                if (removeButton) {
                    removeButton.addEventListener('click', () => {
                        row.remove();
                        if (!balanceAbilitiesList.querySelector('.balance-ability-row')) {
                            createAbilityRow();
                        }
                        updateRemoveAbilityButtons();
                    });
                }

                balanceAbilitiesList.appendChild(row);

                if (initialData && typeof initialData === 'object') {
                    const abilityNameInput = row.querySelector('.balance-ability-name');
                    const abilityImageInput = row.querySelector('.balance-ability-image');
                    const highlightTypeSelect = row.querySelector('.balance-ability-highlight-type');
                    const highlightTextInput = row.querySelector('.balance-ability-highlight-text');
                    const abilityDescriptionInput = row.querySelector('.balance-ability-description');

                    if (abilityNameInput && initialData.name) abilityNameInput.value = initialData.name;
                    if (abilityImageInput && initialData.image) abilityImageInput.value = initialData.image;
                    if (highlightTypeSelect && initialData.highlightType) highlightTypeSelect.value = initialData.highlightType;
                    if (highlightTextInput && initialData.highlightText) highlightTextInput.value = initialData.highlightText;
                    if (abilityDescriptionInput && initialData.description) abilityDescriptionInput.value = initialData.description;
                }

                updateRemoveAbilityButtons();
            };

            const collectBalanceData = () => {
                const characterName = balanceCharacterNameInput ? balanceCharacterNameInput.value.trim() : '';
                if (!characterName) {
                    setBalanceFeedback('Character name is required for the balance section.', 'error');
                    focusBalanceBuilder();
                    return null;
                }

                const statOneValue = balanceStatOneValueInput ? balanceStatOneValueInput.value.trim() : '';
                const statOneLabel = balanceStatOneLabelInput ? balanceStatOneLabelInput.value.trim() : '';
                const statTwoValue = balanceStatTwoValueInput ? balanceStatTwoValueInput.value.trim() : '';
                const statTwoLabel = balanceStatTwoLabelInput ? balanceStatTwoLabelInput.value.trim() : '';

                if ((statOneValue && !statOneLabel) || (!statOneValue && statOneLabel)) {
                    setBalanceFeedback('Provide both value and label for stat block #1 or leave both blank.', 'error');
                    focusBalanceBuilder();
                    return null;
                }

                if ((statTwoValue && !statTwoLabel) || (!statTwoValue && statTwoLabel)) {
                    setBalanceFeedback('Provide both value and label for stat block #2 or leave both blank.', 'error');
                    focusBalanceBuilder();
                    return null;
                }

                const abilityRows = Array.from(balanceAbilitiesList.querySelectorAll('.balance-ability-row'));
                const abilities = [];
                for (const row of abilityRows) {
                    const nameInput = row.querySelector('.balance-ability-name');
                    const descriptionInput = row.querySelector('.balance-ability-description');
                    const imageInput = row.querySelector('.balance-ability-image');
                    const highlightTypeSelect = row.querySelector('.balance-ability-highlight-type');
                    const highlightTextInput = row.querySelector('.balance-ability-highlight-text');

                    const name = nameInput ? nameInput.value.trim() : '';
                    const description = descriptionInput ? descriptionInput.value.trim() : '';
                    const image = imageInput ? imageInput.value.trim() : '';
                    const highlightType = highlightTypeSelect ? highlightTypeSelect.value : 'none';
                    const highlightText = highlightTextInput ? highlightTextInput.value.trim() : '';

                    const hasAnyInput = name || description || image || highlightText;
                    if (!hasAnyInput) {
                        continue;
                    }

                    if (!name) {
                        setBalanceFeedback('Each ability entry must include a name.', 'error');
                        focusBalanceBuilder();
                        return null;
                    }

                    if (!description) {
                        setBalanceFeedback(`Add a description for ${name}.`, 'error');
                        focusBalanceBuilder();
                        return null;
                    }

                    let resolvedHighlightType = highlightType && highlightType !== 'none' ? highlightType : 'none';
                    let resolvedHighlightText = highlightText;
                    if (!resolvedHighlightText) {
                        resolvedHighlightType = 'none';
                    } else if (!['damage', 'effect', 'defense', 'support'].includes(resolvedHighlightType)) {
                        resolvedHighlightType = 'note';
                    }

                    abilities.push({
                        name,
                        description,
                        image,
                        highlightType: resolvedHighlightType,
                        highlightText: resolvedHighlightType === 'none' ? '' : resolvedHighlightText
                    });
                }

                if (!abilities.length) {
                    setBalanceFeedback('Add at least one ability with a name and description.', 'error');
                    focusBalanceBuilder();
                    return null;
                }

                const stats = [];
                if (statOneValue && statOneLabel) {
                    stats.push({ value: statOneValue, label: statOneLabel });
                }
                if (statTwoValue && statTwoLabel) {
                    stats.push({ value: statTwoValue, label: statTwoLabel });
                }

                return {
                    characterName,
                    characterSubtitle: balanceCharacterSubtitleInput ? balanceCharacterSubtitleInput.value.trim() : '',
                    characterImage: balanceCharacterImageInput ? balanceCharacterImageInput.value.trim() : '',
                    sectionTitle: balanceSectionTitleInput && balanceSectionTitleInput.value.trim()
                        ? balanceSectionTitleInput.value.trim()
                        : 'Character Skills',
                    stats,
                    abilities
                };
            };

            const buildBalanceSectionHtml = (data) => {
                const statsHtml = data.stats && data.stats.length
                    ? `<div class="balance-stats-grid">${data.stats.map((stat) => `
                            <div class="balance-stat-item">
                                <span class="balance-stat-value">${escapeHtml(stat.value)}</span>
                                <span class="balance-stat-label">${escapeHtml(stat.label)}</span>
                            </div>
                        `).join('')}</div>`
                    : '';

                const abilitiesHtml = data.abilities.map((ability) => {
                    const descriptionHtml = escapeHtml(ability.description).replace(/\r?\n/g, '<br>');
                    const highlightSpan = ability.highlightText
                        ? ` <span class="balance-highlight balance-highlight-${ability.highlightType}">${escapeHtml(ability.highlightText)}</span>`
                        : '';
                    const imageHtml = ability.image
                        ? `<img src="${escapeAttribute(ability.image)}" alt="${escapeAttribute(ability.name)} icon" class="balance-ability-image">`
                        : '';
                    return `
                        <div class="balance-ability-item">
                            ${imageHtml}
                            <div class="balance-ability-content">
                                <h3 class="balance-ability-name">${escapeHtml(ability.name)}</h3>
                                <p class="balance-ability-description">${descriptionHtml}${highlightSpan}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                const imageHtml = data.characterImage
                    ? `<img src="${escapeAttribute(data.characterImage)}" alt="${escapeAttribute(data.characterName)}" class="balance-character-image">`
                    : '';

                const subtitleHtml = data.characterSubtitle
                    ? `<p class="balance-character-subtitle">${escapeHtml(data.characterSubtitle)}</p>`
                    : '';

                return `
                    <section class="balance-profile-container">
                        <div class="balance-character-header">
                            <div class="balance-profile-top">
                                ${imageHtml}
                                <div class="balance-character-info">
                                    <h1 class="balance-character-title">${escapeHtml(data.characterName)}</h1>
                                    ${subtitleHtml}
                                </div>
                            </div>
                            ${statsHtml}
                        </div>
                        <div class="balance-abilities-section">
                            <div class="balance-section-header">
                                <h2 class="balance-section-title">${escapeHtml(data.sectionTitle)}</h2>
                            </div>
                            ${abilitiesHtml}
                        </div>
                    </section>
                `;
            };

            if (balanceAddAbilityButton) {
                balanceAddAbilityButton.addEventListener('click', () => {
                    createAbilityRow();
                    setBalanceFeedback('', 'info');
                });
            }

            if (balanceInsertButton) {
                balanceInsertButton.addEventListener('click', () => {
                    const data = collectBalanceData();
                    if (!data) {
                        return;
                    }
                    const balanceHtml = buildBalanceSectionHtml(data);
                    insertHtmlAtCursor(balanceHtml);
                    updateHiddenContent();
                    updatePreview();
                    setBalanceFeedback('Balance section inserted into the editor.', 'success');
                });
            }

            createAbilityRow();
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!passwordInput || !titleInput || !contentInput) {
                setFeedback('Missing required form elements.', 'error');
                return;
            }

            const password = passwordInput.value.trim();
            const title = titleInput.value.trim();
            const content = updateHiddenContent();

            if (!password || !title || !content) {
                setFeedback('Password, title, and content are required.', 'error');
                return;
            }

            const payload = {
                password,
                title,
                slug: slugInput && slugInput.value.trim() ? slugInput.value.trim() : undefined,
                category: categoryInput ? categoryInput.value.trim() : '',
                displayDate: displayDateInput ? displayDateInput.value.trim() : '',
                thumbnailUrl: thumbnailInput ? thumbnailInput.value.trim() : '',
                headerImageUrl: headerImageInput ? headerImageInput.value.trim() : '',
                summary: summaryInput ? summaryInput.value.trim() : '',
                content
            };

            if (publishedAtInput && publishedAtInput.value) {
                const publishedDate = new Date(publishedAtInput.value);
                if (Number.isNaN(publishedDate.getTime())) {
                    setFeedback('Invalid Published At value.', 'error');
                    return;
                }
                payload.publishedAt = publishedDate.toISOString();
            }

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Publishing...';
            }
            setFeedback('Publishing post...', 'info');

            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create post');
                }

                const viewUrl = result.slug ? `/post.html?slug=${encodeURIComponent(result.slug)}` : null;
                const successMessage = viewUrl
                    ? `Post published successfully! <a href="${viewUrl}">View the post</a>.`
                    : 'Post published successfully!';
                setFeedback(successMessage, 'success', { html: true });

                form.reset();
                if (editor) {
                    editor.innerHTML = '';
                }
                if (plainTextarea) {
                    plainTextarea.value = '';
                }
                setEditorMode('rich', { force: true });
                updateHiddenContent('');
                resetPreview();
            } catch (error) {
                setFeedback(error.message, 'error');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Publish Post';
                }
            }
        });

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                form.reset();
                if (editor) {
                    editor.innerHTML = '';
                }
                if (plainTextarea) {
                    plainTextarea.value = '';
                }
                setEditorMode('rich', { force: true });
                updateHiddenContent('');
                resetPreview();
                setFeedback('Form cleared.', 'info');
            });
        }

        setEditorMode('rich', { force: true });
        updateHiddenContent('');
        resetPreview();
    };

    function performSearch(rawTerm) {
        const normalizedTerm = (rawTerm || '').toLowerCase();

        if (pageType === 'index' || pageType === 'archive') {
            const articles = document.querySelectorAll('.article-small');
            let matchesFound = false;

            articles.forEach((article) => {
                const titleElement = article.querySelector('h3');
                const categoryElement = article.querySelector('.category');
                const title = titleElement ? titleElement.textContent.toLowerCase() : '';
                const category = categoryElement ? categoryElement.textContent.toLowerCase() : '';
                const wrapper = article.closest('a') || article;

                if (!normalizedTerm || title.includes(normalizedTerm) || category.includes(normalizedTerm)) {
                    matchesFound = true;
                    if (wrapper) {
                        wrapper.style.display = '';
                    }
                } else if (wrapper) {
                    wrapper.style.display = 'none';
                }
            });

            const emptyStateId = pageType === 'index' ? 'index-empty-state' : 'archive-empty-state';
            const emptyState = document.getElementById(emptyStateId);
            showEmptyState(emptyState, !matchesFound);
            return;
        }

        if (pageType === 'post') {
            const blogContainer = document.querySelector('.blog-content');
            if (!blogContainer) {
                return;
            }
            const searchableElements = blogContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li');
            let matchFound = false;

            searchableElements.forEach((element) => {
                const text = element.textContent.toLowerCase();
                if (!normalizedTerm || text.includes(normalizedTerm)) {
                    matchFound = true;
                    element.style.backgroundColor = normalizedTerm ? 'yellow' : '';
                } else {
                    element.style.backgroundColor = '';
                }
            });

            let noResultsMessage = document.getElementById('no-results-message');
            if (normalizedTerm && !matchFound) {
                if (!noResultsMessage) {
                    noResultsMessage = document.createElement('p');
                    noResultsMessage.id = 'no-results-message';
                    noResultsMessage.style.color = 'red';
                    noResultsMessage.style.fontWeight = 'bold';
                    noResultsMessage.style.marginTop = '20px';
                    blogContainer.appendChild(noResultsMessage);
                }
                noResultsMessage.textContent = `No results found for: ${rawTerm}`;
                noResultsMessage.style.display = 'block';
            } else if (noResultsMessage) {
                noResultsMessage.style.display = 'none';
            }
        }
    }

    let postsReady = Promise.resolve();

    if (pageType === 'index') {
        postsReady = fetchPosts({ limit: 4 })
            .then((posts) => {
                renderIndex(posts);
            })
            .catch((error) => {
                console.error(error);
                handlePostsError('featured-posts');
            });
    } else if (pageType === 'archive') {
        postsReady = fetchPosts()
            .then((posts) => {
                renderArchive(posts);
            })
            .catch((error) => {
                console.error(error);
                handlePostsError('archive-featured');
            });
    } else if (pageType === 'post') {
        postsReady = fetchPosts()
            .then((posts) => {
                renderPostDetail(posts);
            })
            .catch((error) => {
                console.error(error);
                const loadingEl = document.getElementById('post-loading');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }
                const errorEl = document.getElementById('post-error');
                if (errorEl) {
                    errorEl.removeAttribute('hidden');
                }
            });
    }

    if (pageType === 'create-post') {
        initCreatePostPage();
    }

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            postsReady.then(() => performSearch(searchInput.value));
        });
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                postsReady.then(() => performSearch(searchInput.value));
            }
        });
    }

    if (mobileSearchButton && mobileSearchInput) {
        mobileSearchButton.addEventListener('click', () => {
            postsReady.then(() => performSearch(mobileSearchInput.value));
        });
        mobileSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                postsReady.then(() => performSearch(mobileSearchInput.value));
            }
        });
    }

    postsReady.finally(() => {
        if (searchTermFromUrl) {
            performSearch(searchTermFromUrl);
        }
    });
});

















