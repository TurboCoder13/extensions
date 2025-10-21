# Zshrc Manager

A powerful Raycast extension for managing your `~/.zshrc` configuration file. View, organize, and edit your shell aliases, exports, functions, and more with an intuitive interface.

## Features

### 📊 **Statistics & Overview**
- View comprehensive statistics of your zshrc configuration
- See counts of aliases, exports, functions, plugins, and more
- Navigate to specific sections and entry types

### 🖥️ **Alias Management**
- Browse all aliases organized by sections
- Add new aliases with validation
- Edit existing aliases
- Search and filter aliases by name, command, or section

### 📦 **Export Management**
- Manage environment variable exports
- Add, edit, and organize exports
- Search exports by variable name or value

### ⚙️ **Advanced Configuration**
- View and manage functions, plugins, sources, evals, and setopts
- Organize content by logical sections
- Search across all configuration types

### 🔍 **Smart Search**
- Search across all content types
- Filter by section, name, command, or value
- Real-time search with instant results

### 📝 **Section Management**
- View zshrc content organized by logical sections
- See detailed breakdowns of each section
- Copy section content or individual entries

## Commands

| Command | Description |
|---------|-------------|
| **Zshrc Statistics** | Overview of your entire zshrc configuration |
| **Sections** | Browse and manage logical sections |
| **Aliases** | Manage shell aliases |
| **Exports** | Manage environment variable exports |
| **Functions** | View and manage shell functions |
| **Plugins** | Manage zsh plugins |
| **Sources** | View source commands |
| **Evals** | Manage eval commands |
| **Setopts** | View setopt configurations |

## Usage

### Getting Started
1. Install the extension from the Raycast Store
2. Open any command to view your zshrc configuration
3. Use search to find specific entries
4. Use actions to add, edit, or copy content

### Adding New Aliases
1. Open the "Aliases" command
2. Press `Cmd+N` or click "Add New Alias"
3. Enter the alias name and command
4. Save to add to your zshrc file

### Managing Exports
1. Open the "Exports" command
2. Press `Cmd+N` to add a new export
3. Enter the variable name (uppercase) and value
4. Save to update your zshrc file

### Searching Content
- Use the search bar in any command
- Search by name, command, section, or value
- Results update in real-time as you type

## Requirements

- **Shell**: Zsh (Z shell)
- **File**: `~/.zshrc` configuration file
- **Permissions**: Read/write access to your home directory

## Error Handling

The extension includes robust error handling:
- **File Not Found**: Graceful fallback with cached data
- **Permission Errors**: Clear error messages with suggestions
- **Large Files**: Automatic content truncation for performance
- **Validation**: Input validation for aliases and exports

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+N` | Add new alias/export |
| `Cmd+R` | Refresh data |
| `Cmd+O` | Open ~/.zshrc in default editor |
| `Cmd+C` | Copy selected content |

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm run test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run fix-lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/eitel13/raycast-extensions/issues)
- **Documentation**: [Extension README](https://github.com/eitel13/raycast-extensions/tree/main/zshrc-manager)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.