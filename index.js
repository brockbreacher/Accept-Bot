require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// —— CONFIGURATION START ——
const DATA_DIR = './roledata'; // Directory for storing role assignments
const REQUIRED_PERMISSIONS = PermissionFlagsBits.ManageRoles;
// —— CONFIGURATION END ——

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Ensure data directory exists on startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
  console.log(`[Init] Created data directory at ${DATA_DIR}`);
}

// —— EVENT HANDLERS ——

client.on('ready', async () => {
  console.log(`[Ready] Logged in as ${client.user.tag}`);

  try {
    await client.application.commands.create(
      new SlashCommandBuilder()
        .setName('accept-role')
        .setDescription('Set role to assign after rules acceptance')
        .addRoleOption(option => option
          .setName('role')
          .setDescription('Role to assign')
          .setRequired(true))
        .setDefaultMemberPermissions(REQUIRED_PERMISSIONS)
    );
    console.log('[Setup] Registered /accept-role command');
  } catch (err) {
    console.error('[Error] Command registration failed:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'accept-role') return;

  const { guild, options } = interaction;
  const role = options.getRole('role');
  const botMember = await guild.members.fetchMe();

  // —— VALIDATION CHECKS ——
  
  // Check rules screening is enabled
  if (!guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED')) {
    return interaction.reply({
      content: '❌ This server must enable **Membership Screening** in Server Settings!',
      ephemeral: true
    });
  }

  // Verify bot permissions
  if (!botMember.permissions.has(REQUIRED_PERMISSIONS)) {
    return interaction.reply({
      content: '❌ I need "Manage Roles" permission to do this!',
      ephemeral: true
    });
  }

  // Check role hierarchy
  if (role.position >= botMember.roles.highest.position) {
    return interaction.reply({
      content: `❌ My highest role (${botMember.roles.highest.name}) must be above "${role.name}"!`,
      ephemeral: true
    });
  }

  // —— CONFIGURATION SAVING ——
  try {
    fs.writeFileSync(path.join(DATA_DIR, guild.id), role.id);
    console.log(`[Config] Set accept-role for ${guild.name} (ID: ${guild.id}) to ${role.name}`);
    
    await interaction.reply({
      content: `✅ Users will automatically receive ${role.name} after accepting rules!`,
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
    const roleId = fs.readFileSync(filePath, 'utf8').trim();
    const role = newMember.guild.roles.cache.get(roleId);

    // Validate role exists and is assignable
    if (role && role.position < newMember.guild.members.me.roles.highest.position) {
      await newMember.roles.add(role);
      console.log(`[Action] Assigned ${role.name} to ${newMember.user.tag}`);
    }
  } catch (err) {
    console.error('[Error] Role assignment failed:', err);
  }
});

// —— BOT STARTUP ——
client.login(process.env.TOKEN)
  .then(() => console.log('[Auth] Connecting to Discord...'))
  .catch(err => console.error('[Fatal] Login failed:', err));