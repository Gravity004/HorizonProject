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

    if (!botToken) {
        console.error('[Guild Check] ❌ DISCORD_BOT_TOKEN is missing or empty!');
        return null;
    }
    if (!guildId) {
        console.error('[Guild Check] ❌ GUILD_ID is missing or empty!');
        return null;
    }

    console.log(`[Guild Check] Calling Discord API for user ${discordId} in guild ${guildId}`);

    const response = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordId}`,
        { headers: { Authorization: `Bot ${botToken}` } }
    );

    console.log(`[Guild Check] Discord API response status: ${response.status}`);

    if (response.status === 404) {
        console.log(`[Guild Check] User ${discordId} NOT found in guild`);
        return null;
    }
    if (!response.ok) {
        const body = await response.text();
        console.error(`[Guild Check] ❌ Discord API error ${response.status}: ${body}`);
        throw new Error(`Discord API error: ${response.status} - ${body}`);
    }
    console.log(`[Guild Check] ✅ User ${discordId} found in guild`);
    return await response.json();
}

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log(`[OAuth] ===== Login attempt: ${profile.username} (${profile.id}) =====`);
        console.log(`[OAuth] ENV CHECK - GUILD_ID: ${process.env.GUILD_ID ? '✅ set' : '❌ MISSING'}`);
        console.log(`[OAuth] ENV CHECK - DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? '✅ set' : '❌ MISSING'}`);
        console.log(`[OAuth] ENV CHECK - ROLE_GARUDA_ID: ${process.env.ROLE_GARUDA_ID ? '✅ set' : '❌ MISSING'}`);

        const GuildId = process.env.GUILD_ID?.trim();
        if (!GuildId) {
            console.error('[OAuth] ❌ GUILD_ID not configured - blocking login');
            return done(null, false, { message: 'server_not_configured' });
        }

        // ✅ ใช้ Bot Token ตรวจสอบ guild membership
        console.log(`[OAuth] Checking guild membership via Bot: ${GuildId}`);
        const memberData = await checkGuildWithBot(profile.id);

        // ❌ ไม่อยู่ใน guild
        if (!memberData) {
            console.error(`[OAuth] ❌ User ${profile.username} NOT in guild or bot error`);
            return done(null, false, { message: 'not_in_guild' });
        }

        const discordRoles = memberData.roles || [];
        console.log(`[OAuth] User roles in guild: [${discordRoles.join(', ')}]`);
        console.log(`[OAuth] Looking for GARUDA_ID=${process.env.ROLE_GARUDA_ID}, NAGA_ID=${process.env.ROLE_NAGA_ID}, QILIN_ID=${process.env.ROLE_QILIN_ID}, ERAWAN_ID=${process.env.ROLE_ERAWAN_ID}`);

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

        console.log(`[OAuth] Assigned roles: [${assignedRoles.join(', ')}]`);

        // ✅ Admin ผ่านได้เลยแม้ไม่มี house role
        const isAdmin = assignedRoles.includes('admin');

        if (!isAdmin) {
            // ❌ ต้องมี role บ้านอย่างน้อย 1 บ้าน (สำหรับคนที่ไม่ใช่ admin)
            const houseRoles = ['garuda', 'naga', 'qilin', 'erawan'];
            const hasHouse = assignedRoles.some(role => houseRoles.includes(role));

            if (!hasHouse) {
                console.error('[OAuth] ❌ User has no house role - blocking login');
                return done(null, false, { message: 'no_house_assigned' });
            }
        } else {
            console.log('[OAuth] ✅ Admin user - bypassing house role requirement');
        }

        console.log(`[OAuth] ✅ User verified - Roles: ${assignedRoles.join(', ')}`);

        // สร้างหรืออัพเดท user
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
        console.error('[OAuth] ❌ Strategy Error:', err.message, err.stack);
        return done(null, false, { message: 'server_error' });
    }
}));

