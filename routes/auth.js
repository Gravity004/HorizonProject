const express = require('express');
const passport = require('passport');
const router = express.Router();
const { checkGuildMembership } = require('../middleware/auth');

// Redirect to Discord login
router.get('/discord', passport.authenticate('discord'));

// Discord callback — ส่ง error code กลับไปที่ homepage
router.get('/discord/callback',
    passport.authenticate('discord', {
        failureRedirect: '/?error=access_denied',
        failureMessage: true
    }),
    (req, res) => {
        // ตรวจสอบ failure message จาก passport strategy
        if (req.session?.messages?.length) {
            const msg = req.session.messages[req.session.messages.length - 1];
            req.session.messages = [];
            const errorMap = {
                'not_in_guild': 'not_in_guild',
                'no_house_assigned': 'no_role',
                'server_not_configured': 'server_not_configured',
            };
            const errorCode = errorMap[msg] || 'access_denied';
            return res.redirect(`/?error=${errorCode}`);
        }
        res.redirect('/dashboard');
    }
);

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return res.redirect('/'); }
        res.redirect('/');
    });
});

// สถานะ login — ส่ง JSON เสมอ (ไม่ redirect)
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ authenticated: true, user: { username: req.user.username } });
    }
    res.json({ authenticated: false });
});

// ข้อมูล user ปัจจุบัน — ผ่าน checkGuildMembership
router.get('/me', checkGuildMembership, async (req, res) => {
    const User = require('../models/User');
    try {
        const user = await User.findById(req.user.id).populate('inventory.itemId');
        res.json({
            authenticated: true,
            user: {
                discordId: user.discordId,
                username: user.username,
                avatar: user.avatar,
                roles: user.roles,
                balance: user.balance,
                house: user.house,
                inventory: user.inventory
            }
        });
    } catch (err) {
        res.json({
            authenticated: true,
            user: {
                discordId: req.user.discordId,
                username: req.user.username,
                avatar: req.user.avatar,
                roles: req.user.roles,
                balance: req.user.balance,
                house: req.user.house,
                inventory: req.user.inventory || []
            }
        });
    }
});

module.exports = router;
