# Payload System Documentation

The payload system allows you to pre-fill the Federal Time Table form using URL parameters. This is useful for creating shareable links that automatically populate form fields.

## How to Use

### 1. Generate a Shareable Link

Click the "🔗 Share Link" button in the Federal Time Table to generate a link with all current form data.

### 2. Manual URL Construction

You can also manually construct URLs with specific parameters:

```
http://localhost:3001/?incidentName=Wildfire%20Response&incidentNumber=WF-2024-001&contractorAgencyName=ABC%20Fire%20Services&date=10/09/24
```

## Supported Parameters

### Form Fields
- `agreementNumber` - Agreement Number
- `contractorAgencyName` - Contractor Agency Name
- `resourceOrderNumber` - Resource Order Number
- `incidentName` - Incident Name
- `incidentNumber` - Incident Number
- `financialCode` - Financial Code
- `equipmentMakeModel` - Equipment Make/Model
- `equipmentType` - Equipment Type
- `serialVinNumber` - Serial/VIN Number
- `licenseIdNumber` - License ID Number
- `transportRetained` - Transport Retained
- `isFirstLastTicket` - Is First/Last Ticket
- `rateType` - Rate Type
- `agencyRepresentative` - Agency Representative
- `incidentSupervisor` - Incident Supervisor
- `remarks` - Remarks
- `date` - Selected Date (MM/DD/YY format)

### Checkbox States
- `noMealsLodging` - No Meals/Lodging (true/false)
- `noMeals` - No Meals (true/false)
- `travel` - Travel (true/false)
- `noLunch` - No Lunch (true/false)
- `hotline` - Hotline (true/false)

### Equipment Entries
- `equipmentCount` - Number of equipment entries
- `equipment_0_date` - First equipment entry date
- `equipment_0_start` - First equipment entry start time
- `equipment_0_stop` - First equipment entry stop time
- `equipment_0_total` - First equipment entry total
- `equipment_0_quantity` - First equipment entry quantity
- `equipment_0_type` - First equipment entry type
- `equipment_0_remarks` - First equipment entry remarks
- (Repeat for additional entries: `equipment_1_*`, `equipment_2_*`, etc.)

### Personnel Entries
- `personnelCount` - Number of personnel entries
- `personnel_0_date` - First personnel entry date
- `personnel_0_name` - First personnel entry name
- `personnel_0_start1` - First personnel entry start time
- `personnel_0_stop1` - First personnel entry stop time
- `personnel_0_total` - First personnel entry total
- `personnel_0_remarks` - First personnel entry remarks
- (Repeat for additional entries: `personnel_1_*`, `personnel_2_*`, etc.)

## Example URLs

### Basic Form Pre-fill (Test this first!)
```
http://localhost:3001/?incidentName=Wildfire%20Response&incidentNumber=WF-2024-001&contractorAgencyName=ABC%20Fire%20Services&date=10/09/24
```

### Simple Test URL
```
http://localhost:3001/?incidentName=Test%20Incident&incidentNumber=TEST-001&contractorAgencyName=Test%20Company
```

### With Checkbox States
```
http://localhost:3001/?incidentName=Wildfire%20Response&incidentNumber=WF-2024-001&travel=true&hotline=false&date=10/09/24
```

### With Equipment Entry
```
http://localhost:3001/?incidentName=Wildfire%20Response&incidentNumber=WF-2024-001&equipmentCount=1&equipment_0_date=10/09/24&equipment_0_start=08:00&equipment_0_stop=17:00&equipment_0_total=9&equipment_0_type=HOURS&date=10/09/24
```

### Complete Example
```
http://localhost:3001/?incidentName=Wildfire%20Response&incidentNumber=WF-2024-001&contractorAgencyName=ABC%20Fire%20Services&agreementNumber=AGR-2024-001&equipmentMakeModel=Fire%20Truck%20Model%20X&equipmentType=Type%201&serialVinNumber=FT-12345&licenseIdNumber=LIC-67890&transportRetained=Yes&isFirstLastTicket=First&rateType=Standard&agencyRepresentative=John%20Doe&incidentSupervisor=Jane%20Smith&travel=true&hotline=false&equipmentCount=1&equipment_0_date=10/09/24&equipment_0_start=08:00&equipment_0_stop=17:00&equipment_0_total=9&equipment_0_quantity=1&equipment_0_type=HOURS&equipment_0_remarks=Fire%20suppression%20work&date=10/09/24
```

## Features

- **Automatic Application**: URL parameters are automatically applied when the page loads
- **URL Cleanup**: Parameters are removed from the URL after application to keep it clean
- **Type Safety**: All parameters are properly typed and validated
- **Flexible**: Supports partial payloads (only include the fields you want to pre-fill)
- **Shareable**: Generated links can be shared with others to pre-fill their forms

## Technical Details

- Parameters are URL-encoded for safety
- Boolean values are passed as "true" or "false" strings
- Arrays (equipment/personnel entries) use indexed parameter names
- The system automatically handles type conversion and validation
- Empty or undefined values are ignored
