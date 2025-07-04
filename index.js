require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// —— CONFIGURATION START ——
const DATA_DIR = './roledata';
const REQUIRED_PERMISSIONS = PermissionFlagsBits.ManageRoles;
const MAX_ADDITIONAL_ROLES = 5;
// —— CONFIGURATION END ——

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
  console.log(`[Init] Created data directory at ${DATA_DIR}`);
}

// —— EVENT HANDLERS ——

client.on('ready', async () => {
  console.log(`[Ready] Logged in as ${client.user.tag}`);

  // Set bot status if environment variables are present
  if (process.env.ACTIVITY) {
    try {
      const activityTypes = {
        'PLAYING': ActivityType.Playing,
        'LISTENING': ActivityType.Listening,
        'WATCHING': ActivityType.Watching
      };

      const typeKey = process.env.TYPE ? process.env.TYPE.toUpperCase() : 'PLAYING';
      const selectedType = activityTypes[typeKey] || ActivityType.Playing;

      client.user.setPresence({
        activities: [{
          name: process.env.ACTIVITY,
          type: selectedType
        }],
        status: 'online'
      });

      console.log(`[Status] Set activity to ${typeKey} "${process.env.ACTIVITY}"`);
    } catch (err) {
      console.error('[Error] Failed to set activity:', err);
    }
  }

  try {
    const command = new SlashCommandBuilder()
      .setName('accept-role')
      .setDescription('Set role(s) to assign after rules acceptance')
      .addRoleOption(option => option
        .setName('primary-role')
        .setDescription('Main role to assign (required)')
        .setRequired(true));

    // Add additional role options dynamically
    for (let i = 1; i <= MAX_ADDITIONAL_ROLES; i++) {
      command.addRoleOption(option => option
        .setName(`additional-role-${i}`)
        .setDescription('Optional additional role'));
    }

    command.setDefaultMemberPermissions(REQUIRED_PERMISSIONS);

    await client.application.commands.create(command);
    console.log('[Setup] Registered /accept-role command');
  } catch (err) {
    console.error('[Error] Command registration failed:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'accept-role') return;

  const { guild, options } = interaction;
  const botMember = await guild.members.fetchMe();

  // Collect all provided roles
  const roles = [];
  const primaryRole = options.getRole('primary-role');
  if (primaryRole) roles.push(primaryRole);

  // Check additional roles
  for (let i = 1; i <= MAX_ADDITIONAL_ROLES; i++) {
    const additionalRole = options.getRole(`additional-role-${i}`);
    if (additionalRole) roles.push(additionalRole);
  }

  // Check for duplicates
  const roleIds = roles.map(role => role.id);
  const duplicateRoles = roles.filter((role, index) => roleIds.indexOf(role.id) !== index);

  if (duplicateRoles.length > 0) {
    const duplicateNames = [...new Set(duplicateRoles.map(role => role.name))];
    return interaction.reply({
      content: `❌ You've added the same role multiple times: ${duplicateNames.join(', ')}. Please remove duplicates.`,
      ephemeral: true
    });
  }

  // —— VALIDATION CHECKS ——
  if (!guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED')) {
    return interaction.reply({
      content: '❌ This server must enable **Membership Screening** in Server Settings!',
      ephemeral: true
    });
  }

  if (!botMember.permissions.has(REQUIRED_PERMISSIONS)) {
    return interaction.reply({
      content: '❌ I need "Manage Roles" permission to do this!',
      ephemeral: true
    });
  }

  // Validate all roles and check hierarchy/permissions
  const unmanageableRoles = [];
  for (const role of roles) {
    if (role.position >= botMember.roles.highest.position) {
      unmanageableRoles.push(role.name);
    } else if (!botMember.roles.cache.some(r => r.position >= role.position)) {
      unmanageableRoles.push(role.name);
    }
  }

  if (unmanageableRoles.length > 0) {
    return interaction.reply({
      content: `❌ I can't manage these roles: ${unmanageableRoles.join(', ')}. Make sure my highest role is above them and I have permission.`,
      ephemeral: true
    });
  }

  // —— CONFIGURATION SAVING ——
  try {
    const roleData = roles.map(r => r.id).join(':');
    fs.writeFileSync(path.join(DATA_DIR, guild.id), roleData);
    console.log(`[Config] Set accept-roles for ${guild.name} (ID: ${guild.id}) to ${roles.map(r => r.name).join(', ')}`);
    
    await interaction.reply({
      content: `✅ Users will automatically receive these roles after accepting rules: ${roles.map(r => r.name).join(', ')}`,
      ephemeral: true
    });
  } catch (err) {
    console.error('[Error] Failed to save configuration:', err);
    await interaction.reply({
      content: '❌ Failed to save configuration! Check bot logs.',
      ephemeral: true
    });
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  // Only trigger when member goes from pending → non-pending (rules accepted)
  if (!oldMember.pending || newMember.pending) return;

  const filePath = path.join(DATA_DIR, newMember.guild.id);
  
  // Skip if no auto-role configured
  if (!fs.existsSync(filePath)) return;

  try {
    const roleData = fs.readFileSync(filePath, 'utf8').trim();
    const roleIds = roleData.split(':');
    const roles = roleIds.map(id => newMember.guild.roles.cache.get(id)).filter(role => {
      // Only return roles the bot can actually manage
      return role && 
             role.position < newMember.guild.members.me.roles.highest.position &&
             newMember.guild.members.me.roles.cache.some(r => r.position >= role.position);
    });

    if (roles.length > 0) {
      await newMember.roles.add(roles);
      console.log(`[Action] Assigned roles to ${newMember.user.tag}: ${roles.map(r => r.name).join(', ')}`);
    }
  } catch (err) {
    console.error('[Error] Role assignment failed:', err);
    // Don't crash, just log the error
  }
});

// —— BOT STARTUP ——
client.login(process.env.TOKEN)
  .then(() => console.log('[Auth] Connecting to Discord...'))
  .catch(err => console.error('[Fatal] Login failed:', err));
