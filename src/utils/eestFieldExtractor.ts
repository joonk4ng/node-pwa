// EEST Field Extractor - Extract actual field names from the EEST PDF
import * as PDFLib from 'pdf-lib';

export interface EESTFieldInfo {
  name: string;
  type: string;
  value?: string;
}

/**
 * Extract all field names from the EEST PDF
 */
export async function extractEESTFieldNames(): Promise<EESTFieldInfo[]> {
  try {
    console.log('🔍 EEST Field Extractor: Starting field extraction...');
    
    // Get the EEST PDF from storage
    const response = await fetch('/eest-fill.pdf');
    if (!response.ok) {
      throw new Error(`Failed to fetch EEST PDF: ${response.status}`);
    }
    
    const pdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    
    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log('🔍 EEST Field Extractor: Found', fields.length, 'fields in PDF');
    
    const fieldInfo: EESTFieldInfo[] = fields.map(field => {
      const fieldInfo: EESTFieldInfo = {
        name: field.getName(),
        type: field.constructor.name
      };
      
      // Try to get the current value
      try {
        if (field.constructor.name === 'PDFTextField') {
          fieldInfo.value = (field as any).getText();
        } else if (field.constructor.name === 'PDFCheckBox') {
          fieldInfo.value = (field as any).isChecked() ? 'Yes' : 'No';
        } else if (field.constructor.name === 'PDFDropdown') {
          fieldInfo.value = (field as any).getSelected()?.[0] || '';
        }
      } catch (error) {
        console.warn('Could not get value for field:', field.getName(), error);
      }
      
      return fieldInfo;
    });
    
    console.log('🔍 EEST Field Extractor: Field extraction completed');
    return fieldInfo;
    
  } catch (error) {
    console.error('🔍 EEST Field Extractor: Error extracting fields:', error);
    throw error;
  }
}

/**
 * Compare mapped field names with actual PDF field names
 */
export async function compareEESTFieldMapping(): Promise<{
  mappedFields: string[];
  actualFields: string[];
  matches: string[];
  mismatches: string[];
}> {
  try {
    console.log('🔍 EEST Field Extractor: Comparing field mapping...');
    
    // Get actual field names from PDF
    const actualFieldInfo = await extractEESTFieldNames();
    const actualFields = actualFieldInfo.map(f => f.name);
    
    // Get mapped field names from field mapper
    const { mapEESTToPDFFields } = await import('./fieldmapper/eestFieldMapper');
    
    // Create test form data
    const testFormData = {
      formType: 'EEST' as any,
      agreementNumber: 'TEST-AG-001',
      contractorAgencyName: 'Test Company',
      resourceOrderNumber: 'TEST-RO-001',
      incidentName: 'Test Fire',
      incidentNumber: 'TEST-FIRE-001',
      operatorName: 'Test Operator',
      equipmentMake: 'Test Make',
      equipmentModel: 'Test Model',
      serialNumber: 'TEST-SERIAL-001',
      licenseNumber: 'TEST-LIC-001',
      equipmentStatus: 'Contractor',
      invoicePostedBy: 'TO',
      dateSigned: '2024-01-15',
      remarks: 'Test remarks',
      remarksOptions: ['HOTLINE'],
      customRemarks: ['Test custom remark']
    };
    
    const testTimeEntries = [
      {
        id: 1,
        date: '2024-01-15',
        start: '0800',
        stop: '1700',
        work: '9.0',
        special: 'None',
        total: '9.0'
      }
    ];
    
    const mappedFields = mapEESTToPDFFields(testFormData, testTimeEntries);
    const mappedFieldNames = Object.keys(mappedFields);
    
    // Find matches and mismatches
    const matches = mappedFieldNames.filter(name => actualFields.includes(name));
    const mismatches = mappedFieldNames.filter(name => !actualFields.includes(name));
    
    console.log('🔍 EEST Field Extractor: Field comparison completed');
    
    return {
      mappedFields: mappedFieldNames,
      actualFields: actualFields,
      matches: matches,
      mismatches: mismatches
    };
    
  } catch (error) {
    console.error('🔍 EEST Field Extractor: Error comparing field mapping:', error);
    throw error;
  }
}

/**
 * Log all EEST field information to console
 */
export async function logEESTFieldInfo(): Promise<void> {
  console.group('🔍 EEST Field Information');
  
  try {
    const fieldInfo = await extractEESTFieldNames();
    
    console.log('📋 All PDF Fields:');
    fieldInfo.forEach((field, index) => {
      console.log(`${index + 1}. "${field.name}" (${field.type})${field.value ? ` = "${field.value}"` : ''}`);
    });
    
    console.log('\n📊 Field Summary:');
    console.log(`- Total fields: ${fieldInfo.length}`);
    console.log(`- Text fields: ${fieldInfo.filter(f => f.type === 'PDFTextField').length}`);
    console.log(`- Checkbox fields: ${fieldInfo.filter(f => f.type === 'PDFCheckBox').length}`);
    console.log(`- Dropdown fields: ${fieldInfo.filter(f => f.type === 'PDFDropdown').length}`);
    
    // Compare with mapped fields
    const comparison = await compareEESTFieldMapping();
    
    console.log('\n🔍 Field Mapping Comparison:');
    console.log(`- Mapped fields: ${comparison.mappedFields.length}`);
    console.log(`- Actual fields: ${comparison.actualFields.length}`);
    console.log(`- Matches: ${comparison.matches.length}`);
    console.log(`- Mismatches: ${comparison.mismatches.length}`);
    
    if (comparison.mismatches.length > 0) {
      console.log('\n❌ Mismatched Fields:');
      comparison.mismatches.forEach(field => {
        console.log(`- "${field}"`);
      });
    }
    
    if (comparison.matches.length > 0) {
      console.log('\n✅ Matched Fields:');
      comparison.matches.forEach(field => {
        console.log(`- "${field}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error logging field info:', error);
  }
  
  console.groupEnd();
}
