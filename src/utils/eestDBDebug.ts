// EEST Database Debug Utility
// Helps troubleshoot EEST data persistence issues

import { engineTimeDB, type EESTFormData, type EESTTimeEntry } from './engineTimeDB';

export interface EESTDBDebugInfo {
  formDataExists: boolean;
  formData: EESTFormData | null;
  timeEntriesCount: number;
  timeEntries: EESTTimeEntry[];
  databaseVersion: number;
  databaseName: string;
}

/**
 * Debug function to check EEST database state
 */
export async function debugEESTDatabase(): Promise<EESTDBDebugInfo> {
  console.log('🔍 EEST DB Debug: Starting database check...');
  
  try {
    // Check if database is accessible
    const dbName = engineTimeDB.name;
    const dbVersion = engineTimeDB.verno;
    
    console.log('🔍 EEST DB Debug: Database info:', { name: dbName, version: dbVersion });
    
    // Check form data
    const formData = await engineTimeDB.eestForm.get(1);
    console.log('🔍 EEST DB Debug: Form data check:', formData);
    
    // Check time entries
    const timeEntries = await engineTimeDB.eestTimeEntries.toArray();
    console.log('🔍 EEST DB Debug: Time entries check:', timeEntries);
    
    // Check all tables
    const allTables = {
      eestForm: await engineTimeDB.eestForm.toArray(),
      eestTimeEntries: await engineTimeDB.eestTimeEntries.toArray(),
      pdfMetadata: await engineTimeDB.pdfMetadata.toArray()
    };
    
    console.log('🔍 EEST DB Debug: All EEST tables:', allTables);
    
    return {
      formDataExists: !!formData,
      formData: formData || null,
      timeEntriesCount: timeEntries.length,
      timeEntries: timeEntries,
      databaseVersion: dbVersion,
      databaseName: dbName
    };
    
  } catch (error) {
    console.error('🔍 EEST DB Debug: Error checking database:', error);
    throw error;
  }
}

/**
 * Test function to save and retrieve EEST form data
 */
export async function testEESTDataPersistence(): Promise<boolean> {
  console.log('🔍 EEST DB Debug: Testing data persistence...');
  
  try {
    // Create test form data
    const testFormData: EESTFormData = {
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
      dateSigned: new Date().toISOString().split('T')[0],
      remarks: 'Test remarks',
      remarksOptions: ['HOTLINE'],
      customRemarks: ['Test custom remark']
    };
    
    // Save test data
    console.log('🔍 EEST DB Debug: Saving test form data...');
    testFormData.id = 1;
    await engineTimeDB.eestForm.put(testFormData);
    
    // Retrieve test data
    console.log('🔍 EEST DB Debug: Retrieving test form data...');
    const retrievedData = await engineTimeDB.eestForm.get(1);
    
    // Compare data
    const isMatch = JSON.stringify(testFormData) === JSON.stringify(retrievedData);
    console.log('🔍 EEST DB Debug: Data persistence test result:', isMatch);
    
    if (isMatch) {
      console.log('✅ EEST DB Debug: Data persistence test PASSED');
    } else {
      console.log('❌ EEST DB Debug: Data persistence test FAILED');
      console.log('Expected:', testFormData);
      console.log('Retrieved:', retrievedData);
    }
    
    return isMatch;
    
  } catch (error) {
    console.error('🔍 EEST DB Debug: Error testing data persistence:', error);
    return false;
  }
}

/**
 * Clear all EEST data from database
 */
export async function clearEESTData(): Promise<void> {
  console.log('🔍 EEST DB Debug: Clearing all EEST data...');
  
  try {
    await engineTimeDB.eestForm.clear();
    await engineTimeDB.eestTimeEntries.clear();
    console.log('✅ EEST DB Debug: EEST data cleared successfully');
  } catch (error) {
    console.error('🔍 EEST DB Debug: Error clearing EEST data:', error);
    throw error;
  }
}

/**
 * Log current EEST database state to console
 */
export async function logEESTDatabaseState(): Promise<void> {
  console.group('🔍 EEST Database State');
  
  try {
    const debugInfo = await debugEESTDatabase();
    
    console.log('📊 Database Info:', {
      name: debugInfo.databaseName,
      version: debugInfo.databaseVersion
    });
    
    console.log('📋 Form Data:', {
      exists: debugInfo.formDataExists,
      data: debugInfo.formData
    });
    
    console.log('⏰ Time Entries:', {
      count: debugInfo.timeEntriesCount,
      entries: debugInfo.timeEntries
    });
    
  } catch (error) {
    console.error('❌ Error logging database state:', error);
  }
  
  console.groupEnd();
}
