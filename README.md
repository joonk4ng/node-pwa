# Engine Time Report PWA

A Progressive Web App (PWA) for filling out Oregon Emergency Equipment Shift Tickets. This mobile-friendly application allows users to enter equipment and personnel time tracking data and generate filled PDF forms.

## Features

- 📱 **Mobile-First Design**: Optimized for touch devices and mobile use
- 🔄 **Progressive Web App**: Installable, works offline, and provides native app-like experience
- 📝 **Complete Form Coverage**: All fields from the Oregon Emergency Equipment Shift Ticket
- 📊 **Time Tracking**: Multiple time entries with equipment and personnel tracking
- 📄 **PDF Generation**: Auto-fills the official PDF template (coming soon)
- 💾 **Offline Support**: Works without internet connection
- 🎨 **Modern UI**: Clean, accessible interface with responsive design

## Form Sections

1. **Header Information**: Division/Unit and Shift details
2. **General Information**: Owner/Contractor, incident details, equipment information
3. **Time Tracking**: Up to 5 time entries with:
   - Date and equipment use type (Hours/Miles/Days)
   - Beginning and ending times/readings
   - Operator/Personnel names
   - Job descriptions
   - Personnel time tracking
   - Signatures
4. **Approval**: Supervisor signatures and approval information

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd engine-time-report
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Service worker caches resources for offline use
- **Responsive Design**: Works on all screen sizes
- **Touch Optimized**: Large touch targets and mobile-friendly inputs

## PDF Generation

The app includes a PDF generation system that will populate the official Oregon Emergency Equipment Shift Ticket PDF template. Currently, it generates a placeholder PDF while the full implementation is being developed.

### Field Mapping

The PDF generator maps form data to the official PDF fields using the extracted field names from the Oregon Department of Forestry template.

## Development

### Project Structure

```
src/
├── App.tsx              # Main application component
├── App.css              # Styles for the application
├── main.tsx             # Application entry point
└── utils/
    └── pdfGenerator.ts  # PDF generation utilities
```

### Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and development server
- **pdf-lib**: PDF manipulation library
- **PWA Plugin**: Progressive Web App support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue in the repository.
