document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    switchNav('shop');
});

let currentUser = null;
let currentItems = [];
let currentRecipes = [];
let allItems = []; // For admin dropdowns

// ═══════════════════════════════════════════════
// CUSTOM CONFIRM DIALOG
// ═══════════════════════════════════════════════
function showConfirm(title, message, onOk, onCancel) {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    overlay.classList.add('active');

    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    function close() {
        overlay.classList.remove('active');
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    }
    function handleOk() { close(); if (onOk) onOk(); }
    function handleCancel() { close(); if (onCancel) onCancel(); }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}

// ═══════════════════════════════════════════════
// AUTHENTICATION
// ═══════════════════════════════════════════════
async function checkAuth() {
    try {
        const response = await fetch('/auth/me', { credentials: 'include' });
        const data = await response.json();

        // ถูก kick ออกจาก guild หรือไม่มีสิทธิ์ — redirect ทันที
        if (!response.ok || !data.authenticated) {
            const dest = data?.redirect || '/?error=access_denied';
            window.location.href = dest;
            return;
        }

        currentUser = data.user;
        renderUserProfile();
        setupAdminControls();

        fetchShopItems();
        fetchInventory();
        fetchRecipes();
        fetchBalance();
        fetchMailbox(); // Initialize mailbox badge

    } catch (err) {
        console.error('Auth check failed', err);
        window.location.href = '/';
    }
}

function renderUserProfile() {
    document.getElementById('userName').textContent = currentUser.username;
    if (currentUser.avatar && currentUser.discordId) {
        document.getElementById('userAvatar').src =
            `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png?size=128`;
    }
    document.getElementById('userGold').textContent = currentUser.balance;

    const roleContainer = document.getElementById('userRole');
    if (roleContainer) {
        const roleLabels = {
            admin: '⚡ ADMIN', professor: '🎓 PROFESSOR', student: '📚 STUDENT',
            garuda: '🦅 พญาครุฑ', naga: '🐍 พญานาค', qilin: '🦌 กิเลน', erawan: '🐘 เอราวัณ'
        };
        roleContainer.innerHTML = currentUser.roles.map(r =>
            `<span class="badge role-${r}">${roleLabels[r] || r.toUpperCase()}</span>`
        ).join('');
    }
    updateGoldStacks(currentUser.balance);
    renderHealthUI();
}

function renderHealthUI() {
    const hp = currentUser.health || 0;
    const maxHp = currentUser.maxHealth || 100;
    document.getElementById('userHpText').textContent = `${hp}/${maxHp}`;
    
    const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    document.getElementById('userHpBar').style.width = `${hpPercentage}%`;

    const faintedOverlay = document.getElementById('faintedOverlay');
    const navButtons = document.querySelectorAll('.spell-btn:not([onclick*="inventory"]):not([onclick*="shop"]):not(#adminTabBtn):not([onclick*="openLogModal"])');
    
    if (hp < 30) {
        // FATIGUED/FAINTED State
        faintedOverlay.classList.add('active');
        navButtons.forEach(btn => btn.classList.add('disabled-btn'));
    } else {
        // NORMAL State
        faintedOverlay.classList.remove('active');
        navButtons.forEach(btn => btn.classList.remove('disabled-btn'));
    }
}

window.openRecoveryInventory = function() {
    document.getElementById('faintedOverlay').classList.remove('active');
    switchNav('inventory');
}

function setupAdminControls() {
    const isAdmin = currentUser.roles.includes('admin') || currentUser.roles.includes('professor');
    document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('hidden', !isAdmin);
    });
    const adminPanel = document.getElementById('adminControls');
    if (adminPanel && isAdmin) adminPanel.classList.remove('hidden');
}

// ═══════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════
window.switchNav = function (tabId) {
    if (currentUser && currentUser.health < 30 && tabId !== 'inventory' && tabId !== 'shop' && tabId !== 'admin') {
        spawnEffect('❌', 'You are too exhausted to do this. Eat food first.');
        document.getElementById('faintedOverlay').classList.add('active');
        return;
    }

    document.querySelectorAll('.spell-btn').forEach(btn => btn.classList.remove('active'));
    const tabs = { shop: 'shop', craft: 'crafting', bank: 'bank', inventory: 'inventory', mailbox: 'mailbox', admin: 'admin' };
    document.querySelectorAll('.spell-btn').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes(tabs[tabId] || tabId)) btn.classList.add('active');
    });

    document.querySelectorAll('.magic-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // Load data when switching to specific tabs
    if (tabId === 'bank') fetchTransactions();
    if (tabId === 'admin') loadAdminBoosters();
    if (tabId === 'mailbox') fetchMailbox();
}

// ═══════════════════════════════════════════════
// MAGIC SHOP
// ═══════════════════════════════════════════════
async function fetchShopItems() {
    try {
        const response = await fetch('/api/shop/items', { credentials: 'include' });
        currentItems = await response.json();
        allItems = currentItems;
        renderShop(currentItems);
    } catch (err) { console.error('Failed to fetch shop items', err); }
}

function renderShop(items) {
    const container = document.getElementById('shopContainer');
    if (!container) return;
    const isAdmin = currentUser.roles.includes('admin') || currentUser.roles.includes('professor');

    if (!items.length) {
        container.innerHTML = '<p class="empty-msg">The shelves are empty... An Admin must stock items first.</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="magic-card item-rarity-${item.rarity || 'common'}">
            ${isAdmin ? `<button class="delete-btn" style="right:2.7rem;background:#2a3d2a;color:#6af56a;border-color:#3d5c3d;" title="Edit Item" onclick="openEditItemModal('${item._id}')">✎</button><button class="delete-btn" title="Remove Item" onclick="deleteItem('${item._id}')">×</button>` : ''}
            <div class="card-image">
                <img src="${item.image || 'assets/images/placeholder_item.png'}" alt="${item.name}">
            </div>
            <div class="card-info">
                <h3>${item.name}</h3>
                ${item.description ? `<p class="item-desc">${item.description}</p>` : ''}
                <div class="tags-row">
                    <span class="item-type type-${item.type}">${item.type}</span>
                    <span class="item-rarity-tag rarity-${item.rarity || 'common'}">${(item.rarity || 'common').toUpperCase()}</span>
                </div>
                <div class="price-tag">🪙 ${item.price} G</div>
                <div class="card-buy-row">
                    <input type="number" id="qty-${item._id}" class="buy-qty-input" min="1" value="1" title="Quantity">
                    <button class="buy-spell-btn" onclick="buyItem('${item._id}')">Acquire</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.deleteItem = async function (itemId) {
    showConfirm('Remove Item', 'Permanently remove this item from the market?', async () => {
        try {
            const r = await fetch(`/api/shop/${itemId}`, { method: 'DELETE', credentials: 'include' });
            if (r.ok) { spawnEffect('✨', 'Item vanished!'); fetchShopItems(); }
            else alert('Failed to remove item.');
        } catch (err) { console.error(err); }
    });
}

window.buyItem = async function (itemId) {
    const item = currentItems.find(i => i._id === itemId);
    const qtyInput = document.getElementById(`qty-${itemId}`);
    const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
    showConfirm('Acquire Item', `Buy ${qty}x "${item?.name}" for ${(item?.price || 0) * qty}G?`, async () => {
        try {
            const r = await fetch('/api/shop/buy', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, quantity: qty }), credentials: 'include'
            });
            const data = await r.json();
            if (r.ok) {
                currentUser.balance = data.balance;
                renderUserProfile();
                fetchInventory();
                spawnEffect('🛍️', `Acquired ${qty}x ${item?.name}!`);
            } else spawnEffect('❌', data.message);
        } catch (err) { spawnEffect('❌', 'Transaction failed'); }
    });
}

// ═══════════════════════════════════════════════
// ADMIN MODAL (Add Item)
// ═══════════════════════════════════════════════
window.openAdminModal = () => document.getElementById('adminModal').style.display = 'block';

window.closeAdminModal = () => document.getElementById('adminModal').style.display = 'none';

window.cancelAdminModal = function () {
    // Clear all form fields
    const form = document.getElementById('addItemForm');
    if (form) form.reset();
    clearFileInput();
    document.getElementById('imagePreview').innerHTML = '';
    closeAdminModal();
};

window.clearFileInput = function () {
    const fileInput = document.getElementById('itemImageFile');
    if (fileInput) fileInput.value = '';
    document.getElementById('imagePreview').innerHTML = '';
};

window.handleAddItem = async function (e) {
    e.preventDefault();
    const fd = new FormData(e.target);

    let imageUrl = fd.get('image') || '';

    // If user uploaded a file, upload it first
    const fileInput = document.getElementById('itemImageFile');
    if (fileInput && fileInput.files.length > 0) {
        const uploadData = new FormData();
        uploadData.append('image', fileInput.files[0]);
        try {
            const uploadRes = await fetch('/api/shop/upload', {
                method: 'POST', body: uploadData, credentials: 'include'
            });
            if (uploadRes.ok) {
                const result = await uploadRes.json();
                imageUrl = result.imageUrl;
            } else {
                const err = await uploadRes.json();
                spawnEffect('❌', 'Upload failed: ' + err.message);
                return;
            }
        } catch (err) {
            console.error('Upload error:', err);
            spawnEffect('❌', 'Image upload failed');
            return;
        }
    }

    const itemData = {
        name: fd.get('name'), description: fd.get('description'), type: fd.get('type'),
        price: parseInt(fd.get('price')), image: imageUrl, rarity: fd.get('rarity') || 'common'
    };
    try {
        const r = await fetch('/api/shop/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData), credentials: 'include'
        });
        if (r.ok) {
            spawnEffect('📦', 'Item registered!');
            window.cancelAdminModal();
            fetchShopItems();
        } else {
            const data = await r.json();
            spawnEffect('❌', 'Failed: ' + data.message);
        }
    } catch (err) { console.error(err); }
}

// ═══════════════════════════════════════════════
// ADMIN MODAL (Edit Item)
// ═══════════════════════════════════════════════
window.openEditItemModal = function(itemId) {
    const item = currentItems.find(i => i._id === itemId);
    if (!item) return;
    document.getElementById('editItemId').value = item._id;
    document.getElementById('editItemName').value = item.name || '';
    document.getElementById('editItemDescription').value = item.description || '';
    document.getElementById('editItemType').value = item.type || 'material';
    document.getElementById('editItemRarity').value = item.rarity || 'common';
    document.getElementById('editItemPrice').value = item.price || 0;
    document.getElementById('editItemImage').value = item.image || '';
    document.getElementById('editItemModal').style.display = 'block';
}

window.closeEditItemModal = function() {
    document.getElementById('editItemModal').style.display = 'none';
}

window.handleEditItem = async function(e) {
    e.preventDefault();
    const itemId = document.getElementById('editItemId').value;
    const itemData = {
        name: document.getElementById('editItemName').value,
        description: document.getElementById('editItemDescription').value,
        type: document.getElementById('editItemType').value,
        rarity: document.getElementById('editItemRarity').value,
        price: parseInt(document.getElementById('editItemPrice').value),
        image: document.getElementById('editItemImage').value
    };
    try {
        const r = await fetch('/api/shop/' + itemId, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData), credentials: 'include'
        });
        if (r.ok) {
            spawnEffect('✨', 'Item updated!');
            closeEditItemModal();
            fetchShopItems();
        } else {
            const data = await r.json();
            spawnEffect('❌', 'Failed: ' + data.message);
        }
    } catch (err) { console.error(err); }
}

// Image file preview
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('itemImageFile');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const preview = document.getElementById('imagePreview');
            if (e.target.files.length > 0) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="max-width:120px;border-radius:8px;margin-top:.5rem;">`;
                };
                reader.readAsDataURL(e.target.files[0]);
            } else {
                preview.innerHTML = '';
            }
        });
    }
});

// ═══════════════════════════════════════════════
// CRAFTING STATION
// ═══════════════════════════════════════════════
async function fetchRecipes() {
    try {
        const r = await fetch('/api/craft/recipes', { credentials: 'include' });
        currentRecipes = await r.json();

        // Inject Amortentia Potion Recipe dynamically
        const lovePotionRecipe = {
            _id: 'love_potion',
            resultItemName: 'Amortentia Potion',
            craftingType: 'cauldron',
            ingredients: [
                { itemId: { name: 'วัตถุดิบ Legendary ขนิดใดก็ได้ (Any Legendary Item)' }, quantity: 2 },
                { itemId: { name: 'วัตถุดิบ Rare ชนิดใดก็ได้ (Any Rare Item)' }, quantity: 2 }
            ]
        };
        currentRecipes.push(lovePotionRecipe);

        renderRecipes(currentRecipes);
    } catch (err) { console.error('Failed to fetch recipes', err); }
}

function getRecipeName(recipe) {
    return recipe.resultItemId?.name || recipe.resultItemName || 'Unknown';
}

function renderRecipes(recipes) {
    const list = document.getElementById('recipeList');
    if (!list) return;
    if (!recipes.length) {
        list.innerHTML = '<p class="empty-msg">No recipes available.</p>';
        return;
    }
    list.innerHTML = recipes.map(recipe => `
        <div class="scroll-item" onclick="selectRecipe('${recipe._id}')">
            <h4>${getRecipeName(recipe)}</h4>
            <small class="craft-type-tag">${recipe.craftingType}</small>
        </div>
    `).join('');
}

let selectedRecipe = null;
window.selectRecipe = function (recipeId) {
    selectedRecipe = currentRecipes.find(r => r._id === recipeId);
    if (!selectedRecipe) return;

    document.querySelectorAll('.scroll-item').forEach(item => item.classList.remove('active'));
    event?.target?.closest('.scroll-item')?.classList.add('active');

    document.getElementById('craftingTitle').textContent =
        `Brewing: ${getRecipeName(selectedRecipe)}`;

    const container = document.getElementById('craftingIngredients');
    const userInv = currentUser.inventory || [];

    if (recipeId === 'love_potion') {
        const legendaryItems = userInv.filter(i => i.itemId?.rarity === 'legendary');
        const rareItems = userInv.filter(i => i.itemId?.rarity === 'rare');
        
        const legCount = legendaryItems.reduce((s, i) => s + i.quantity, 0);
        const rareCount = rareItems.reduce((s, i) => s + i.quantity, 0);

        container.innerHTML = `
            <div class="ingredient-check ${legCount >= 2 ? 'ok' : 'missing'}">
                <span>Any Legendary Item</span>
                <span>${legCount}/2 ${legCount >= 2 ? '✅' : '❌'}</span>
            </div>
            <div class="ingredient-check ${rareCount >= 2 ? 'ok' : 'missing'}">
                <span>Any Rare Item</span>
                <span>${rareCount}/2 ${rareCount >= 2 ? '✅' : '❌'}</span>
            </div>
        `;
        
        const canCraft = legCount >= 2 && rareCount >= 2;
        const btn = document.getElementById('craftBtn');
        btn.disabled = !canCraft;
        btn.onclick = () => craftItem(recipeId);
        return;
    }

    container.innerHTML = selectedRecipe.ingredients.map(ing => {
        const ingId = ing.itemId?._id || ing.itemId;
        const userHas = userInv.find(i => (i.itemId?._id || i.itemId) === ingId)?.quantity || 0;
        const hasEnough = userHas >= ing.quantity;
        return `
            <div class="ingredient-check ${hasEnough ? 'ok' : 'missing'}">
                <span>${ing.itemId?.name || 'Unknown'}</span>
                <span>${userHas}/${ing.quantity} ${hasEnough ? '✅' : '❌'}</span>
            </div>
        `;
    }).join('');

    const canCraft = selectedRecipe.ingredients.every(ing => {
        const ingId = ing.itemId?._id || ing.itemId;
        const userHas = userInv.find(i => (i.itemId?._id || i.itemId) === ingId)?.quantity || 0;
        return userHas >= ing.quantity;
    });

    const btn = document.getElementById('craftBtn');
    btn.disabled = !canCraft;
    btn.onclick = () => craftItem(recipeId);
}


async function craftItem(recipeId) {
    const cauldron = document.querySelector('.cauldron-visual');
    if (cauldron) cauldron.classList.add('brewing');
    document.getElementById('craftBtn').disabled = true;

    // Crafting animation delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
        const r = await fetch('/api/craft/craft', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeId }), credentials: 'include'
        });
        const data = await r.json();
        if (cauldron) cauldron.classList.remove('brewing');

        if (r.ok) {
            spawnCraftSuccess(data.resultItemName);
            fetchInventory();
            // Re-check recipe after inventory changed
            setTimeout(() => { if (selectedRecipe?._id === recipeId) selectRecipe(recipeId); }, 500);
        } else {
            alert(data.message);
        }
    } catch (err) {
        if (cauldron) cauldron.classList.remove('brewing');
        alert('The spell fizzled out...');
    }
}

function spawnCraftSuccess(itemName) {
    const overlay = document.getElementById('effectsOverlay');
    overlay.innerHTML = `
        <div class="craft-success-effect">
            <div class="craft-particles">
                ${Array.from({ length: 20 }, () => `<span class="particle" style="--x:${Math.random() * 200 - 100}px;--y:${Math.random() * -200 - 50}px;--d:${Math.random() * 2 + 0.5}s"></span>`).join('')}
            </div>
            <div class="craft-result-popup">
                <span class="glow-text">✨ Crafted! ✨</span>
                <h3>${itemName}</h3>
            </div>
        </div>
    `;
    overlay.classList.add('active');
    setTimeout(() => { overlay.classList.remove('active'); overlay.innerHTML = ''; }, 3000);
}

// ═══════════════════════════════════════════════
// Thanaraksh BANK
// ═══════════════════════════════════════════════
async function fetchBalance() {
    try {
        const r = await fetch('/api/bank/balance', { credentials: 'include' });
        const data = await r.json();
        if (data.balance !== undefined) {
            currentUser.balance = data.balance;
            renderUserProfile();
        }
    } catch (err) { }
}

function updateGoldStacks(balance) {
    const container = document.querySelector('.vault-gold-pile');
    if (!container) return;
    const stackCount = 7;
    let html = '';
    for (let i = 0; i < stackCount; i++) {
        const baseHeight = Math.min(balance / 50, 100);
        const randomVar = (Math.sin(i * 1.5) + i) * 8;
        const height = Math.max(5, baseHeight + randomVar);
        html += `<div class="coin-stack-visual" style="height: ${height}px"></div>`;
    }
    container.innerHTML = html;
}

let userTransactions = [];
let userTransactionsSkip = 0;
const USER_TX_LIMIT = 20;

async function fetchTransactions(loadMore = false) {
    if (!loadMore) {
        userTransactions = [];
        userTransactionsSkip = 0;
        const container = document.getElementById('transactionList');
        if (container) container.innerHTML = '<p class="empty-msg">Fetching ledger...</p>';
    }

    try {
        const r = await fetch(`/api/bank/transactions?skip=${userTransactionsSkip}&limit=${USER_TX_LIMIT}`, { credentials: 'include' });
        const txs = await r.json();
        
        if (txs.length > 0) {
            userTransactions = userTransactions.concat(txs);
            userTransactionsSkip += USER_TX_LIMIT;
        }

        renderTransactions(userTransactions);

        const btn = document.getElementById('loadMoreTxBtn');
        if (btn) btn.style.display = txs.length === USER_TX_LIMIT ? 'block' : 'none';
        
    } catch (err) { console.error(err); }
}

window.loadMoreTransactions = function() {
    fetchTransactions(true);
}

function renderTransactions(txs) {
    const container = document.getElementById('transactionList');
    if (!container) return;
    if (!txs.length) {
        container.innerHTML = '<p class="empty-msg">No transactions yet.</p>';
        return;
    }
    container.innerHTML = txs.map(tx => {
        const isSender = tx.senderName === currentUser.username;
        let logLabel = '';
        if (tx.type === 'admin_adjust') logLabel = `<span class="tx-tag adj">ADJ</span>`;
        else if (isSender) logLabel = `<span class="tx-tag out">OUT</span>`;
        else logLabel = `<span class="tx-tag in">IN</span>`;

        const color = isSender ? 'tx-out' : 'tx-in';
        const sign = isSender ? '-' : '+';
        return `
            <div class="tx-row ${color}">
                <div class="tx-icon-wrap">${logLabel}</div>
                <div class="tx-details">
                    <strong>${tx.description || tx.type}</strong>
                    <small>${new Date(tx.timestamp).toLocaleString('th-TH')}</small>
                </div>
                <span class="tx-amount">${sign}${tx.amount}G</span>
                <small class="tx-id">${tx.transactionId}</small>
            </div>
        `;
    }).join('');
}

window.transferFunds = async function () {
    const recipient = document.getElementById('recipientId').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value);
    if (!recipient || !amount || amount <= 0) {
        spawnEffect('❌', 'Please enter a valid recipient and amount.'); return;
    }
    showConfirm('Transfer Funds', `Transfer ${amount}G to "${recipient}"?`, async () => {
        // Gold flying animation
        spawnGoldTransfer();

        try {
            const r = await fetch('/api/bank/transfer', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId: recipient, amount }), credentials: 'include'
            });
            const data = await r.json();
            if (r.ok) {
                currentUser.balance = data.newBalance;
                renderUserProfile();
                fetchTransactions();
                document.getElementById('transferAmount').value = '';
                document.getElementById('recipientId').value = '';
                // Show receipt
                showTransferReceipt(data.transaction);
            } else {
                spawnEffect('❌', data.message);
            }
        } catch (err) { spawnEffect('❌', 'The transfer owl got lost.'); }
    });
}

function spawnGoldTransfer() {
    const overlay = document.getElementById('effectsOverlay');
    overlay.innerHTML = `
        <div class="transfer-effect">
            ${Array.from({ length: 15 }, (_, i) => `<span class="gold-coin" style="--delay:${i * 0.1}s;--x:${Math.random() * 100 - 50}px">🪙</span>`).join('')}
        </div>
    `;
    overlay.classList.add('active');
    setTimeout(() => { overlay.classList.remove('active'); overlay.innerHTML = ''; }, 2500);
}

function showTransferReceipt(tx) {
    const content = document.getElementById('receiptContent');
    content.innerHTML = `
        <div class="receipt-header">
            <h2>🏦 Thanaraksh Wizarding Bank</h2>
            <p>Official Transfer Receipt</p>
        </div>
        <hr class="receipt-divider">
        <div class="receipt-body">
            <div class="receipt-row"><span>Transaction ID:</span><strong>${tx.transactionId}</strong></div>
            <div class="receipt-row"><span>From:</span><strong>${tx.senderName}</strong></div>
            <div class="receipt-row"><span>To:</span><strong>${tx.recipientName}</strong></div>
            <div class="receipt-row receipt-amount"><span>Amount:</span><strong>🪙 ${tx.amount} Galleons</strong></div>
            <div class="receipt-row"><span>Date:</span><strong>${new Date(tx.timestamp).toLocaleString('th-TH')}</strong></div>
        </div>
        <hr class="receipt-divider">
        <p class="receipt-footer">✦ May your vaults ever overflow ✦</p>
    `;
    document.getElementById('receiptModal').style.display = 'block';
}

window.closeReceiptModal = () => document.getElementById('receiptModal').style.display = 'none';

window.downloadReceipt = function () {
    const content = document.getElementById('receiptContent');
    const text = content.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Thanaraksh_receipt_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
// INVENTORY (with Use Item)
// ═══════════════════════════════════════════════
async function fetchInventory() {
    try {
        const r = await fetch('/auth/me', { credentials: 'include' });
        const data = await r.json();
        if (!r.ok || !data.authenticated) {
            // session หมดหรือถูกเตะออก
            if (data?.redirect) window.location.href = data.redirect;
            return;
        }
        currentUser = data.user;
        renderInventory();
    } catch (err) { console.error('Inventory fetch failed', err); }
}

function renderInventory() {
    const container = document.getElementById('inventoryContainer');
    if (!container) return;
    const inv = currentUser.inventory || [];

    if (!inv.length) {
        container.innerHTML = '<p class="empty-msg">Your satchel is empty. Visit Diagon Alley to stock up.</p>';
        return;
    }

    container.innerHTML = inv.map(slot => {
        const item = slot.itemId;
        const name = item?.name || 'Unknown Artifact';
        const img = item?.image || 'assets/images/placeholder_item.png';
        const type = item?.type || 'unknown';
        const id = item?._id || slot.itemId;
        return `
            <div class="inventory-slot">
                <img src="${img}" alt="${name}">
                <span class="qty">${slot.quantity}</span>
                <div class="inv-tooltip">
                    <strong>${name}</strong>
                    <small>${type}</small>
                    <div class="inv-actions">
                        <button class="use-item-btn" onclick="useItem('${id}', '${name}')">Use</button>
                        <button class="gift-item-btn" onclick="openSendGiftModal('${id}', '${name}', '${img}', ${slot.quantity})">Gift</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.useItem = async function (itemId, itemName) {
    if (itemName === 'Amortentia Potion') {
        // Open custom modal for target username
        openAmortenteiaModal(itemId, itemName);
        return;
    }

    showConfirm('Use Item', `Use "${itemName}"? It will be consumed from your inventory.`, async () => {
        // Sparkle effect
        spawnEffect('✨', `Using ${itemName}...`);

        try {
            const r = await fetch('/api/shop/use', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }), credentials: 'include'
            });
            const data = await r.json();
            if (r.ok) {
                spawnEffect('🌟', data.message);
                if (data.newHealth !== undefined) {
                    currentUser.health = data.newHealth;
                    renderHealthUI();
                }
                fetchInventory();
            } else {
                spawnEffect('❌', data.message);
            }
        } catch (err) { spawnEffect('❌', 'Failed to use item.'); }
    });
}

// ═══════════════════════════════════════════════
// DAILY MAGIC REWARD
// ═══════════════════════════════════════════════
let isDailyMagicCasting = false;

function showChestReward(amount) {
    // Remove any existing chest overlay
    const old = document.getElementById('chestRewardOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'chestRewardOverlay';
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        z-index:99999;display:flex;flex-direction:column;
        justify-content:center;align-items:center;
        background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
        animation:fadeInBg 0.3s ease;
    `;

    // Spawn particles
    const particles = Array.from({length: 20}, (_, i) => {
        const angle = (i / 20) * 360;
        const dist = 80 + Math.random() * 80;
        const x = Math.cos(angle * Math.PI / 180) * dist;
        const y = Math.sin(angle * Math.PI / 180) * dist;
        const emojis = ['✨','🌟','💫','🪙','⭐'];
        return `<span class="chest-particle" style="
            --px:${x}px;--py:${y}px;--d:${0.3+Math.random()*0.6}s;
            position:absolute;font-size:1.2rem;
            animation:burstOut var(--d) ease-out forwards;
        ">${emojis[Math.floor(Math.random()*emojis.length)]}</span>`;
    }).join('');

    overlay.innerHTML = `
        <style>
            @keyframes fadeInBg { from{opacity:0} to{opacity:1} }
            @keyframes chestOpen { 0%{transform:translateY(0) scale(1)} 30%{transform:translateY(-10px) scale(1.1)} 60%{transform:translateY(0) scale(1.05)} 100%{transform:scale(1)} }
            @keyframes burstOut { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0} }
            @keyframes popIn { from{transform:scale(0.2);opacity:0} to{transform:scale(1);opacity:1} }
        </style>
        <div style="position:relative;text-align:center;">
            <div style="font-size:5rem;animation:chestOpen 0.6s ease forwards;">🎁</div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">${particles}</div>
            <div style="animation:popIn 0.4s 0.5s ease both;background:linear-gradient(135deg,#2a1b38,#1a0f28);border:2px solid #d4af37;border-radius:16px;padding:2rem 3rem;margin-top:1rem;box-shadow:0 0 40px rgba(212,175,55,0.5);">
                <div style="font-size:1rem;color:#d4af37;font-family:'Cinzel',serif;letter-spacing:2px;margin-bottom:0.5rem;">DAILY REWARD</div>
                <div style="font-size:3rem;color:#fff;font-family:'Cinzel',serif;font-weight:bold;text-shadow:0 0 20px #d4af37;">+${amount} G</div>
                <div style="color:#a89070;font-size:0.85rem;margin-top:0.5rem;">Galleons received!</div>
            </div>
            <button onclick="document.getElementById('chestRewardOverlay').remove()"
                style="margin-top:1.5rem;padding:0.6rem 2rem;background:linear-gradient(135deg,#d4af37,#b8902e);border:none;border-radius:20px;color:#1a0f28;font-family:'Cinzel',serif;font-weight:bold;cursor:pointer;font-size:0.9rem;">
                ✓ Claim
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    // Auto-remove after 6s
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 6000);
}

window.castDailyMagic = async function () {
    if (isDailyMagicCasting) return;
    const btn = document.getElementById('dailyMagicBtn');
    if (btn && btn.classList.contains('claimed')) {
        spawnEffect('⏳', 'Come back tomorrow at 8:00 AM!');
        return;
    }

    isDailyMagicCasting = true;

    try {
        const response = await fetch('/api/bank/daily', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();

        isDailyMagicCasting = false;

        if (response.ok) {
            // Only lock button for non-admins
            const isAdmin = currentUser && (currentUser.roles.includes('admin') || currentUser.roles.includes('professor'));
            if (!isAdmin && btn) btn.classList.add('claimed');
            currentUser.balance = data.newBalance;
            renderUserProfile();
            fetchTransactions();
            // Show treasure chest pop-up
            showChestReward(data.rewardAmount || 0);
        } else {
            spawnEffect('❌', data.message);
            if (!currentUser.roles.includes('admin') && response.status === 400 && data.message && data.message.includes('tomorrow')) {
                if (btn) btn.classList.add('claimed');
            }
        }
    } catch (err) {
        console.error(err);
        isDailyMagicCasting = false;
        spawnEffect('❌', 'The spell fizzled...');
    }
}

// ═══════════════════════════════════════════════
// MAILBOX & GIFTING 
// ═══════════════════════════════════════════════

// Fetch Inbox
async function fetchMailbox() {
    try {
        const r = await fetch('/api/gift/inbox', { credentials: 'include' });
        const gifts = await r.json();
        _mailboxGiftsCache = gifts;
        renderMailbox(gifts);
        
        // Update notification badge
        const badge = document.getElementById('mailBadge');
        if (badge) {
            if (gifts.length > 0) {
                badge.classList.remove('hidden');
                badge.textContent = gifts.length;
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (err) { console.error('Mailbox fetch failed', err); }
}

function renderMailbox(gifts) {
    const container = document.getElementById('mailboxContainer');
    if (!container) return;

    if (!gifts.length) {
        container.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1;">Your mailbox is empty. No owls today...</p>';
        return;
    }

    container.innerHTML = gifts.map(gift => {
        const itemName = gift.itemId?.name || 'Unknown Artifact';
        const itemImg = gift.itemId?.image || 'assets/images/placeholder_item.png';
        const msgHtml = gift.message ? `<p class="gift-msg" style="font-style:italic;font-size:0.9rem;color:#5d3a1a;margin:0.4rem 0;">"${gift.message}"</p>` : '';
        
        return `
            <div class="gift-card letter-style">
                <div class="gift-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
                    <span class="gift-sender" style="font-family:'Cinzel',serif;font-size:0.9rem;color:#4e342e;font-weight:bold;">✉ From: ${gift.senderName}</span>
                    <span class="gift-time" style="font-size:0.75rem;color:#8d6e63;">${new Date(gift.timestamp).toLocaleDateString('th-TH')}</span>
                </div>
                ${msgHtml}
                <div class="gift-body" style="display:flex;align-items:center;gap:0.8rem;background:rgba(200,170,120,0.25);border-radius:6px;padding:0.6rem;margin:0.5rem 0;">
                    <img src="${itemImg}" alt="${itemName}" style="width:42px;height:42px;object-fit:contain;border-radius:4px;">
                    <div>
                        <strong style="color:#3e2723;font-size:0.9rem;">${itemName}</strong><br>
                        <small style="color:#6d4c41;">Qty: ${gift.quantity}</small>
                    </div>
                </div>
                <button class="letter-send-btn" style="width:100%;margin-top:0.5rem;padding:0.5rem;" onclick="openReadLetterModal('${gift._id}')">📖 Open Letter</button>
            </div>
        `;
    }).join('');
}

window.claimGift = async function(giftId) {
    try {
        const r = await fetch('/api/gift/claim', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giftId }), credentials: 'include'
        });
        const data = await r.json();
        if (r.ok) {
            spawnEffect('✨', data.message);
            fetchMailbox();
            fetchInventory();
        } else {
            spawnEffect('❌', data.message);
        }
    } catch (err) {
        spawnEffect('❌', 'Failed to claim gift.');
    }
}

// ═══════════════════════════════════════════════
// READ LETTER MODAL
// ═══════════════════════════════════════════════
let _mailboxGiftsCache = [];

window.openReadLetterModal = function(giftId) {
    const gift = _mailboxGiftsCache.find(g => g._id === giftId);
    if (!gift) return;
    const itemName = gift.itemId?.name || 'Unknown Artifact';
    const itemImg = gift.itemId?.image || 'assets/images/placeholder_item.png';
    document.getElementById('readLetterSender').textContent = 'From: ' + gift.senderName;
    document.getElementById('readLetterItemName').textContent = itemName;
    document.getElementById('readLetterItemImg').src = itemImg;
    document.getElementById('readLetterItemQty').textContent = 'Qty: ' + gift.quantity;
    document.getElementById('readLetterMessage').textContent = gift.message || '(No message included)';
    document.getElementById('readLetterGiftId').value = giftId;
    document.getElementById('readLetterModal').style.display = 'block';
}

window.closeReadLetterModal = function() {
    document.getElementById('readLetterModal').style.display = 'none';
}

window.submitClaimGift = function() {
    const giftId = document.getElementById('readLetterGiftId').value;
    if (giftId) { closeReadLetterModal(); claimGift(giftId); }
}

// Send Gift Modal
window.openSendGiftModal = function (itemId, itemName, itemImg, maxQty) {
    document.getElementById('giftModalItemId').value = itemId;
    document.getElementById('giftModalItemName').textContent = itemName;
    document.getElementById('giftModalItemImg').src = itemImg;
    document.getElementById('giftModalItemQty').textContent = `You have: ${maxQty}`;
    document.getElementById('giftModalQuantity').max = maxQty;
    document.getElementById('giftModalQuantity').value = 1;

    document.getElementById('sendGiftModal').style.display = 'block';
}

window.closeSendGiftModal = function() {
    document.getElementById('sendGiftModal').style.display = 'none';
    document.getElementById('giftModalRecipient').value = '';
    document.getElementById('giftModalMessage').value = '';
}

window.submitSendGift = async function() {
    const itemId = document.getElementById('giftModalItemId').value;
    const recipientId = document.getElementById('giftModalRecipient').value.trim();
    const quantity = parseInt(document.getElementById('giftModalQuantity').value) || 1;
    const message = document.getElementById('giftModalMessage').value.trim();

    if (!recipientId) {
        spawnEffect('❌', 'Please enter a recipient.'); return;
    }

    try {
        const r = await fetch('/api/gift/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId, itemId, quantity, message }), 
            credentials: 'include'
        });
        const data = await r.json();
        if (r.ok) {
            spawnEffect('📨', data.message);
            closeSendGiftModal();
            fetchInventory();
            fetchTransactions();
        } else {
            spawnEffect('❌', data.message);
        }
    } catch (err) {
        spawnEffect('❌', 'Owl failed to deliver the gift.');
    }
}

// ═══════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════
async function loadAdminData() {
    // Populate item dropdowns
    const items = allItems.length ? allItems : currentItems;
    const selects = document.querySelectorAll('#recipeResultItem, .ing-item');
    selects.forEach(sel => {
        if (sel.options.length <= 1) {
            const optionsHtml = items.map(i => `<option value="${i._id}" data-img="${i.image || ''}">${i.name} (${i.type})</option>`).join('');
            sel.innerHTML = sel.id === 'recipeResultItem'
                ? '<option value="">Select existing item (optional)...</option>' + optionsHtml
                : '<option value="">Select item...</option>' + optionsHtml;
        }
    });

    // Attach listener for ingredient previews
    document.querySelectorAll('.ing-item').forEach(attachIngredientListener);
    // Load current recipes for management
    renderAdminRecipes();

    // Attach listener for item preview
    const resSel = document.getElementById('recipeResultItem');
    if (resSel && !resSel.dataset.listener) {
        resSel.dataset.listener = 'true';
        resSel.addEventListener('change', (e) => {
            const val = e.target.value;
            const preview = document.getElementById('recipeImagePreview');
            if (!val || !preview) {
                if(preview) preview.innerHTML = '';
                return;
            }
            const item = items.find(i => i._id === val);
            if (item && item.image) {
                preview.innerHTML = `<img src="${item.image}" alt="Preview" style="width:64px;height:64px;object-fit:contain;margin-top:0.75rem;border-radius:4px;border:1px solid rgba(212,175,55,0.3);background:rgba(0,0,0,0.5);padding:4px;">`;
            } else {
                preview.innerHTML = '';
            }
        });
    }
}

function renderAdminRecipes() {
    const container = document.getElementById('adminRecipeList');
    if (!container) return;
    if (!currentRecipes.length) {
        container.innerHTML = '<p class="empty-msg">No recipes yet.</p>';
        return;
    }
    container.innerHTML = currentRecipes.map(r => `
        <div class="scroll-item admin-recipe-item">
            <div>
                <strong>${getRecipeName(r)}</strong>
                <small>(${r.craftingType})</small>
                <br><small>Ingredients: ${r.ingredients.map(i => i.itemId?.name || '?').join(', ')}</small>
            </div>
            <button class="delete-btn small" onclick="adminDeleteRecipe('${r._id}')">🗑️</button>
        </div>
    `).join('');
}

window.addIngredientRow = function () {
    const container = document.getElementById('ingredientInputs');
    const items = allItems.length ? allItems : currentItems;
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.style.display = 'flex';
    row.style.gap = '0.5rem';
    row.style.alignItems = 'center';
    row.innerHTML = `
        <select class="parchment-input ing-item" style="flex:1;">
            <option value="">Select item...</option>
            ${items.map(i => `<option value="${i._id}" data-img="${i.image || ''}">${i.name} (${i.type})</option>`).join('')}
        </select>
        <img src="" class="ing-preview" style="width:32px;height:32px;object-fit:contain;display:none;">
        <input type="number" class="parchment-input ing-qty" placeholder="Qty" min="1" value="1" style="width:70px;">
        <button class="delete-btn small" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
    attachIngredientListener(row.querySelector('.ing-item'));
}

function attachIngredientListener(selectElement) {
    if(!selectElement || selectElement.dataset.listener) return;
    selectElement.dataset.listener = 'true';
    selectElement.addEventListener('change', (e) => {
        const option = e.target.options[e.target.selectedIndex];
        const previewEl = e.target.parentElement.querySelector('.ing-preview');
        if(!previewEl) return;
        
        if (option && option.dataset.img) {
            previewEl.src = option.dataset.img;
            previewEl.style.display = 'block';
        } else {
            previewEl.src = '';
            previewEl.style.display = 'none';
        }
    });
}

window.adminAddRecipe = async function () {
    const resultItemId = document.getElementById('recipeResultItem').value;
    const resultItemName = document.getElementById('recipeResultName').value.trim();
    const craftingType = document.getElementById('recipeCraftType').value;

    if (!resultItemId && !resultItemName) {
        spawnEffect('❌', 'Enter a result item name or select one from the shop.'); return;
    }

    const rows = document.querySelectorAll('.ingredient-row');
    const ingredients = [];
    rows.forEach(row => {
        const itemId = row.querySelector('.ing-item').value;
        const qty = parseInt(row.querySelector('.ing-qty').value) || 1;
        if (itemId) ingredients.push({ itemId, quantity: qty });
    });

    if (!ingredients.length) { spawnEffect('❌', 'Add at least one ingredient.'); return; }

    const payload = { ingredients, craftingType };
    if (resultItemId) payload.resultItemId = resultItemId;
    if (resultItemName) payload.resultItemName = resultItemName;

    try {
        const r = await fetch('/api/craft/recipes/add', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        if (r.ok) {
            spawnEffect('📜', 'Recipe added!');
            // Reset recipe form
            document.getElementById('recipeResultName').value = '';
            document.getElementById('recipeResultItem').value = '';
            const preview = document.getElementById('recipeImagePreview');
            if (preview) preview.innerHTML = '';
            const firstRow = document.querySelector('#ingredientInputs .ingredient-row');
            if (firstRow) {
                firstRow.querySelector('.ing-item').value = '';
                firstRow.querySelector('.ing-qty').value = '1';
                const fPreview = firstRow.querySelector('.ing-preview');
                if(fPreview) { fPreview.src = ''; fPreview.style.display = 'none'; }
            }
            // Remove extra rows
            document.querySelectorAll('#ingredientInputs .ingredient-row:not(:first-child)').forEach(r => r.remove());
            fetchRecipes();
            setTimeout(renderAdminRecipes, 500);
        } else {
            const data = await r.json();
            spawnEffect('❌', 'Failed: ' + data.message);
        }
    } catch (err) { console.error(err); }
}

window.adminDeleteRecipe = async function (recipeId) {
    showConfirm('Delete Recipe', 'Are you sure you want to delete this recipe?', async () => {
        try {
            const r = await fetch(`/api/craft/recipes/${recipeId}`, { method: 'DELETE', credentials: 'include' });
            if (r.ok) {
                spawnEffect('🗑️', 'Recipe removed.');
                fetchRecipes();
                setTimeout(renderAdminRecipes, 500);
            }
        } catch (err) { console.error(err); }
    });
}

window.adminAdjustGold = async function () {
    const target = document.getElementById('adminTargetUser').value.trim();
    const amount = parseInt(document.getElementById('adminGoldAmount').value);
    const reason = document.getElementById('adminGoldReason').value.trim();

    if (!target || isNaN(amount)) { spawnEffect('❌', 'Fill in target user and amount.'); return; }

    showConfirm('Adjust Gold', `Adjust ${target}'s balance by ${amount}G?`, async () => {
        try {
            const r = await fetch('/api/bank/admin/adjust', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: target, amount, reason }),
                credentials: 'include'
            });
            const data = await r.json();
            if (r.ok) {
                spawnEffect('💰', data.message);
                document.getElementById('adminTargetUser').value = '';
                document.getElementById('adminGoldAmount').value = '';
                document.getElementById('adminGoldReason').value = '';
            } else spawnEffect('❌', data.message);
        } catch (err) { console.error(err); }
    });
}

window.adminAdjustHealth = async function () {
    const targetUserId = document.getElementById('adminTargetHpUser').value.trim();
    const healthAmount = document.getElementById('adminHpAmount').value;

    if (!targetUserId || !healthAmount) {
        spawnEffect('❌', 'Please enter target and HP amount.');
        return;
    }

    try {
        const r = await fetch('/api/users/admin/health', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId, healthAmount }),
            credentials: 'include'
        });
        const data = await r.json();
        if (r.ok) {
            spawnEffect('✨', data.message);
            // If admin adjusted THEIR OWN health, reflect immediately
            if (targetUserId.toLowerCase() === currentUser.username.toLowerCase() || targetUserId === currentUser.discordId) {
                currentUser.health = data.newHealth;
                renderHealthUI();
            }
            document.getElementById('adminTargetHpUser').value = '';
            document.getElementById('adminHpAmount').value = '';
        } else {
            spawnEffect('❌', data.message);
        }
    } catch (err) {
        spawnEffect('❌', 'Failed to adjust HP.');
    }
}

// ═══════════════════════════════════════════════
// LOG MODAL
// ═══════════════════════════════════════════════
let adminLogs = [];
let adminLogsSkip = 0;
const ADMIN_LOGS_LIMIT = 50;

window.openLogModal = async function () {
    document.getElementById('logModal').style.display = 'block';
    document.getElementById('logContainer').innerHTML = '<p class="empty-msg">Loading...</p>';
    adminLogs = [];
    adminLogsSkip = 0;
    const btn = document.getElementById('loadMoreLogsBtn');
    if (btn) btn.style.display = 'none';
    
    await fetchAndRenderLogs();
};

async function fetchAndRenderLogs() {
    try {
        const r = await fetch(`/api/bank/admin/logs?skip=${adminLogsSkip}&limit=${ADMIN_LOGS_LIMIT}`, { credentials: 'include' });
        const logs = await r.json();
        
        if (logs.length > 0) {
            adminLogs = adminLogs.concat(logs);
            adminLogsSkip += ADMIN_LOGS_LIMIT;
            const btn = document.getElementById('loadMoreLogsBtn');
            if (btn) btn.style.display = logs.length === ADMIN_LOGS_LIMIT ? 'block' : 'none';
        }

        renderLogContainer();
    } catch (err) {
        document.getElementById('logContainer').innerHTML = '<p class="empty-msg">Failed to load logs.</p>';
    }
}

window.loadMoreLogs = async function() {
    await fetchAndRenderLogs();
}

window.filterLogs = function() {
    renderLogContainer();
}

function renderLogContainer() {
    const query = (document.getElementById('logSearch')?.value || '').toLowerCase();
    
    const filtered = adminLogs.filter(log => {
        if (!query) return true;
        const searchStr = `${log.type} ${log.description} ${log.senderName} ${log.recipientName} ${log.amount}`.toLowerCase();
        return searchStr.includes(query);
    });

    if (!filtered.length) {
        document.getElementById('logContainer').innerHTML = '<p class="empty-msg">No activity yet.</p>';
        return;
    }
    const typeClass = (t) => {
        if (t === 'transfer') return 'transfer';
        if (t === 'purchase') return 'purchase';
        if (t === 'craft') return 'craft';
        if (t === 'daily_reward') return 'daily_reward';
        return 'admin_adjust';
    };
    document.getElementById('logContainer').innerHTML = filtered.map(log => `
        <div class="log-row">
            <span class="log-type ${typeClass(log.type)}">${log.type.replace('_', ' ')}</span>
            <div>
                <div>${log.description || '-'}</div>
                <div style="font-size:.72rem;color:#8a7a5a">${log.senderName || '?'} → ${log.recipientName || '?'}</div>
                <div class="log-time">${new Date(log.timestamp).toLocaleString('th-TH')}</div>
            </div>
            <span class="log-amount ${log.amount >= 0 ? 'pos' : 'neg'}">${log.amount >= 0 ? '+' : ''}${log.amount}G</span>
        </div>
    `).join('');
}

window.closeLogModal = () => document.getElementById('logModal').style.display = 'none';

// Close modals when clicking outside
window.onclick = function (event) {
    const modals = ['adminModal', 'receiptModal', 'logModal', 'sendGiftModal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (event.target === modal) {
            if (id === 'sendGiftModal') closeSendGiftModal();
            else modal.style.display = 'none';
        }
    });
};

// ═══════════════════════════════════════════════
// AMORTENTIA POTION - Custom Target Modal
// ═══════════════════════════════════════════════
function openAmortenteiaModal(itemId, itemName) {
    const modal = document.getElementById('amortenteiaModal');
    if (!modal) return;
    document.getElementById('amortenteiaItemId').value = itemId;
    document.getElementById('amortenteiaTargetInput').value = '';
    modal.classList.add('active');
}

window.closeAmortenteiaModal = function() {
    const modal = document.getElementById('amortenteiaModal');
    if (modal) modal.classList.remove('active');
}

window.submitAmortenteia = async function() {
    const itemId = document.getElementById('amortenteiaItemId').value;
    const targetUsername = document.getElementById('amortenteiaTargetInput').value.trim();
    if (!targetUsername) {
        spawnEffect('❌', 'Please enter a target username.');
        return;
    }
    closeAmortenteiaModal();
    showConfirm('Amortentia Potion', `Cast Amortentia on "${targetUsername}"?`, async () => {
        spawnEffect('✨', `Casting Amortentia on ${targetUsername}...`);
        try {
            const r = await fetch('/api/shop/use', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, targetUsername }), credentials: 'include'
            });
            const data = await r.json();
            if (r.ok) {
                spawnEffect('💖', data.message);
                fetchInventory();
            } else {
                spawnEffect('❌', data.message);
            }
        } catch (err) { spawnEffect('❌', 'Failed to cast potion.'); }
    });
}
// ═══════════════════════════════════════════════
// SERVER BOOSTERS ADMIN
// ═══════════════════════════════════════════════
window.loadAdminBoosters = async function() {
    try {
        const r = await fetch('/api/users/boosters');
        if(r.ok) {
            const data = await r.json();
            data.forEach((b, i) => {
                const idx = i + 1;
                const nameInp = document.getElementById(`booster${idx}Name`);
                const countInp = document.getElementById(`booster${idx}Count`);
                if(nameInp) nameInp.value = b.name || '';
                if(countInp) countInp.value = b.boosts || 0;
            });
        }
    } catch(e) { console.error('Failed to load server boosters for admin', e); }
}

window.adminUpdateBoosters = async function() {
    const boosters = [];
    for(let i = 1; i <= 3; i++) {
        boosters.push({
            rank: i,
            title: i === 1 ? 'Arcane Sovereign' : (i === 2 ? 'Mystic Conqueror' : 'Enchanted Vanguard'),
            name: document.getElementById(`booster${i}Name`).value.trim() || '- ระบุชื่อ -',
            boosts: parseInt(document.getElementById(`booster${i}Count`).value) || 0
        });
    }

    try {
        const r = await fetch('/api/users/boosters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boosters }),
            credentials: 'include'
        });
        const data = await r.json();
        if(r.ok) {
            spawnEffect('✨', 'Server Boosters updated successfully!');
        } else {
            spawnEffect('❌', 'Error updating boosters');
        }
    } catch(e) { spawnEffect('❌', 'Failed to update boosters'); }
}


// ═══════════════════════════════════════════════
// EFFECTS / ANIMATIONS
// ═══════════════════════════════════════════════
function spawnEffect(emoji, text) {
    const overlay = document.getElementById('effectsOverlay');
    overlay.innerHTML = `
        <div class="toast-effect">
            <span class="toast-emoji">${emoji}</span>
            <span class="toast-text">${text}</span>
        </div>
    `;
    overlay.classList.add('active');
    setTimeout(() => { overlay.classList.remove('active'); overlay.innerHTML = ''; }, 2500);
}
