const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ตรวจสอบ guild membership ผ่าน Bot Token
async function checkGuildWithBot(discordId) {
    const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
    const guildId = process.env.GUILD_ID?.trim();
    if (!botToken || !guildId) return null;

    const response = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordId}`,
        { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Discord API error: ${response.status}`);
    return await response.json();
}

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log(`[OAuth] Login attempt for ${profile.username} (${profile.id})`);

        const GuildId = process.env.GUILD_ID?.trim();
        if (!GuildId) {
            console.error('[OAuth] GUILD_ID not configured - blocking login');
            return done(null, false, { message: 'server_not_configured' });
        }

        // ✅ ใช้ Bot Token ตรวจสอบ guild membership
        console.log(`[OAuth] Checking guild membership via Bot: ${GuildId}`);
        const memberData = await checkGuildWithBot(profile.id);

        // ❌ ไม่อยู่ใน guild
        if (!memberData) {
            console.error(`[OAuth] User ${profile.username} NOT in guild`);
            return done(null, false, { message: 'not_in_guild' });
        }

        const discordRoles = memberData.roles || [];
        console.log(`[OAuth] User roles in guild: ${discordRoles.length} roles found`);

        // กำหนด roles สำหรับ website
        let assignedRoles = ['student'];

        if (process.env.ROLE_ADMIN_ID && discordRoles.includes(process.env.ROLE_ADMIN_ID.trim()))
            assignedRoles.push('admin', 'professor');
        if (process.env.ROLE_GARUDA_ID && discordRoles.includes(process.env.ROLE_GARUDA_ID.trim()))
            assignedRoles.push('garuda');
        if (process.env.ROLE_NAGA_ID && discordRoles.includes(process.env.ROLE_NAGA_ID.trim()))
            assignedRoles.push('naga');
        if (process.env.ROLE_QILIN_ID && discordRoles.includes(process.env.ROLE_QILIN_ID.trim()))
            assignedRoles.push('qilin');
        if (process.env.ROLE_ERAWAN_ID && discordRoles.includes(process.env.ROLE_ERAWAN_ID.trim()))
            assignedRoles.push('erawan');

        // ❌ ต้องมี role บ้านอย่างน้อย 1 บ้าน
        const houseRoles = ['garuda', 'naga', 'qilin', 'erawan'];
        const hasHouse = assignedRoles.some(role => houseRoles.includes(role));

        if (!hasHouse) {
            console.error('[OAuth] User has no house role - blocking login');
            return done(null, false, { message: 'no_house_assigned' });
        }

        console.log(`[OAuth] ✅ User verified - Roles: ${assignedRoles.join(', ')}`);

        // สร้างหรืออัพเดท user (ไม่ต้องเก็บ accessToken แล้ว)
        let user = await User.findOne({ discordId: profile.id });

        if (user) {
            user.username = profile.username;
            user.avatar = profile.avatar;
            user.roles = assignedRoles;
            await user.save();
            console.log(`[OAuth] Updated existing user: ${user.username}`);
            return done(null, user);
        } else {
            const newUser = new User({
                discordId: profile.id,
                username: profile.username,
                avatar: profile.avatar,
                roles: assignedRoles,
            });
            await newUser.save();
            console.log(`[OAuth] Created new user: ${newUser.username}`);
            return done(null, newUser);
        }

    } catch (err) {
        console.error('[OAuth] Strategy Error:', err);
        return done(err, null);
    }
}));

