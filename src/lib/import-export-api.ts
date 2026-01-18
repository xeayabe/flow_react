import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { db } from './db';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Conditionally import native-only modules
let FileSystem: typeof import('expo-file-system') | null = null;
let Sharing: typeof import('expo-sharing') | null = null;

if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
  Sharing = require('expo-sharing');
}

// Types
export interface ParsedRow {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  account?: string;
  originalRow: Record<string, string>;
  rowNumber: number;
  errors: string[];
  isValid: boolean;
}

export interface ColumnMapping {
  date: string | null;
  amount: string | null;
  type: string | null;
  category: string | null;
  note: string | null;
  account: string | null;
}

export interface ParseResult {
  success: boolean;
  headers: string[];
  rawData: Record<string, string>[];
  rowCount: number;
  error?: string;
}

export interface ValidationResult {
  validRows: ParsedRow[];
  invalidRows: ParsedRow[];
  totalIncome: number;
  totalExpenses: number;
  incomeCount: number;
  expenseCount: number;
  categories: string[];
  dateRange: { start: string; end: string } | null;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  newCategoriesCreated: string[];
  totalIncome: number;
  totalExpenses: number;
  errors: string[];
}

export interface ExportFilters {
  dateStart?: string;
  dateEnd?: string;
  categoryIds?: string[];
  accountIds?: string[];
  type?: 'income' | 'expense' | 'all';
}

export interface ExportTransaction {
  date: string;
  type: string;
  amount: number;
  category: string;
  account: string;
  note: string;
}

// Smart column detection patterns
const COLUMN_PATTERNS = {
  date: ['date', 'datum', 'time', 'created', 'transaction date', 'trans date', 'booking date'],
  amount: ['amount', 'betrag', 'value', 'price', 'cost', 'sum', 'total', 'inflow', 'outflow'],
  type: ['type', 'typ', 'kind', 'transaction type', 'trans type', 'cleared'],
  category: ['category', 'kategorie', 'cat', 'group', 'classification', 'category group/category'],
  note: ['note', 'memo', 'description', 'desc', 'comment', 'remarks', 'payee', 'merchant'],
  account: ['account', 'konto', 'bank', 'wallet', 'source'],
};

/**
 * Pick a file from device storage
 */
export async function pickFile(): Promise<{ uri: string; name: string; mimeType: string; file?: File } | null> {
  try {
    if (Platform.OS === 'web') {
      // On web, use native file input for better compatibility
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls,.tsv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            resolve({
              uri: URL.createObjectURL(file),
              name: file.name,
              mimeType: file.type || 'text/csv',
              file: file,
            });
          } else {
            resolve(null);
          }
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    } else {
      // On native, use DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/tab-separated-values',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'text/csv',
      };
    }
  } catch (error) {
    console.error('File picker error:', error);
    return null;
  }
}

/**
 * Parse a CSV or Excel file
 */
export async function parseFile(uri: string, fileName: string, file?: File): Promise<ParseResult> {
  try {
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (Platform.OS === 'web') {
      // On web, read file directly if provided
      if (file) {
        if (isExcel) {
          const arrayBuffer = await file.arrayBuffer();
          return parseExcelFromArrayBuffer(arrayBuffer);
        } else {
          const content = await file.text();
          return parseCSV(content);
        }
      } else {
        // Fallback to fetch for blob URLs
        const response = await fetch(uri);
        if (isExcel) {
          const arrayBuffer = await response.arrayBuffer();
          return parseExcelFromArrayBuffer(arrayBuffer);
        } else {
          const content = await response.text();
          return parseCSV(content);
        }
      }
    } else {
      // On native, use FileSystem
      if (!FileSystem) {
        return {
          success: false,
          headers: [],
          rawData: [],
          rowCount: 0,
          error: 'File system not available.',
        };
      }
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: isExcel ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8,
      });

      if (isExcel) {
        return parseExcel(content);
      } else {
        return parseCSV(content);
      }
    }
  } catch (error) {
    console.error('Parse file error:', error);
    return {
      success: false,
      headers: [],
      rawData: [],
      rowCount: 0,
      error: 'Could not read file. Please check the format.',
    };
  }
}

/**
 * Parse CSV content
 */
function parseCSV(content: string): ParseResult {
  try {
    // Remove BOM if present
    let cleanContent = content;
    if (cleanContent.charCodeAt(0) === 0xFEFF) {
      cleanContent = cleanContent.slice(1);
    }

    console.log('Parsing CSV content, length:', cleanContent.length);
    console.log('First 500 chars:', cleanContent.substring(0, 500));

    // First, try to detect the delimiter by checking the first line
    const firstLine = cleanContent.split('\n')[0];
    let detectedDelimiter = ',';

    // Count potential delimiters in first line
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    console.log('Delimiter counts - tabs:', tabCount, 'commas:', commaCount, 'semicolons:', semicolonCount);

    if (tabCount > commaCount && tabCount > semicolonCount) {
      detectedDelimiter = '\t';
    } else if (semicolonCount > commaCount) {
      detectedDelimiter = ';';
    }

    console.log('Using delimiter:', detectedDelimiter === '\t' ? 'TAB' : detectedDelimiter);

    const result = Papa.parse<Record<string, string>>(cleanContent, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      delimiter: detectedDelimiter,
      dynamicTyping: false,
    });

    console.log('Parse result:', {
      fields: result.meta.fields,
      rowCount: result.data.length,
      errors: result.errors.slice(0, 5),
      delimiter: result.meta.delimiter,
    });

    if (result.errors.length > 0) {
      console.warn('CSV parse warnings:', result.errors.slice(0, 5));
    }

    const headers = result.meta.fields || [];
    const data = result.data.filter((row) =>
      Object.values(row).some((val) => val && String(val).trim() !== '')
    );

    console.log('Headers found:', headers);
    console.log('Filtered data count:', data.length);
    if (data.length > 0) {
      console.log('First row:', data[0]);
    }

    return {
      success: true,
      headers,
      rawData: data,
      rowCount: data.length,
    };
  } catch (error) {
    console.error('CSV parse error:', error);
    return {
      success: false,
      headers: [],
      rawData: [],
      rowCount: 0,
      error: 'Failed to parse CSV file.',
    };
  }
}

/**
 * Parse Excel content (base64 encoded)
 */
function parseExcel(base64Content: string): ParseResult {
  try {
    const workbook = XLSX.read(base64Content, { type: 'base64' });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (jsonData.length === 0) {
      return {
        success: false,
        headers: [],
        rawData: [],
        rowCount: 0,
        error: 'Excel file is empty or has no valid data.',
      };
    }

    const headers = Object.keys(jsonData[0]);

    return {
      success: true,
      headers,
      rawData: jsonData,
      rowCount: jsonData.length,
    };
  } catch (error) {
    console.error('Excel parse error:', error);
    return {
      success: false,
      headers: [],
      rawData: [],
      rowCount: 0,
      error: 'Failed to parse Excel file.',
    };
  }
}

/**
 * Parse Excel content from ArrayBuffer (for web)
 */
function parseExcelFromArrayBuffer(arrayBuffer: ArrayBuffer): ParseResult {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheet];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      defval: '',
      raw: false,
    });

    if (jsonData.length === 0) {
      return {
        success: false,
        headers: [],
        rawData: [],
        rowCount: 0,
        error: 'Excel file is empty or has no valid data.',
      };
    }

    const headers = Object.keys(jsonData[0]);

    return {
      success: true,
      headers,
      rawData: jsonData,
      rowCount: jsonData.length,
    };
  } catch (error) {
    console.error('Excel parse error:', error);
    return {
      success: false,
      headers: [],
      rawData: [],
      rowCount: 0,
      error: 'Failed to parse Excel file.',
    };
  }
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    amount: null,
    type: null,
    category: null,
    note: null,
    account: null,
  };

  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (const pattern of patterns) {
      const matchIndex = lowerHeaders.findIndex(
        (h) => h === pattern || h.includes(pattern)
      );
      if (matchIndex !== -1 && mapping[field as keyof ColumnMapping] === null) {
        mapping[field as keyof ColumnMapping] = headers[matchIndex];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Parse a date string to ISO format (YYYY-MM-DD)
 */
function parseDateToISO(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const cleanDate = dateStr.trim();

  // Try various date formats
  const patterns: { regex: RegExp; parse: (m: RegExpMatchArray) => string }[] = [
    // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    {
      regex: /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/,
      parse: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
    },
    // YYYY-MM-DD, YYYY/MM/DD
    {
      regex: /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/,
      parse: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
    },
    // MM/DD/YYYY (US format)
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parse: (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`,
    },
    // DD.MM.YY
    {
      regex: /^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/,
      parse: (m) => {
        const year = parseInt(m[3]) > 50 ? `19${m[3]}` : `20${m[3]}`;
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      },
    },
  ];

  for (const { regex, parse } of patterns) {
    const match = cleanDate.match(regex);
    if (match) {
      const isoDate = parse(match);
      // Validate the date
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        return isoDate;
      }
    }
  }

  // Try native Date parse as fallback
  const nativeDate = new Date(cleanDate);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === '') return null;

  let clean = amountStr.trim();

  // Remove currency symbols
  clean = clean.replace(/[CHF$€£¥₹]/gi, '').trim();

  // Handle different number formats
  // 1,234.56 (US/UK) or 1.234,56 (EU)
  const hasCommaDecimal = /\d+\.\d{3},\d{2}$/.test(clean);
  const hasDotDecimal = /\d+,\d{3}\.\d{2}$/.test(clean);

  if (hasCommaDecimal) {
    // European format: 1.234,56 -> 1234.56
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (hasDotDecimal) {
    // US format: 1,234.56 -> 1234.56
    clean = clean.replace(/,/g, '');
  } else {
    // Simple format with comma as decimal
    if (clean.includes(',') && !clean.includes('.')) {
      clean = clean.replace(',', '.');
    }
    // Remove remaining commas (thousand separators)
    clean = clean.replace(/,/g, '');
  }

  // Remove spaces
  clean = clean.replace(/\s/g, '');

  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.abs(num);
}

/**
 * Detect transaction type from various inputs
 */
function detectType(
  typeStr: string | undefined,
  amountStr: string | undefined
): 'income' | 'expense' {
  // Check explicit type column
  if (typeStr) {
    const lower = typeStr.toLowerCase().trim();
    if (
      lower === 'income' ||
      lower === 'in' ||
      lower === 'credit' ||
      lower === 'einnahme' ||
      lower === 'einzahlung'
    ) {
      return 'income';
    }
    if (
      lower === 'expense' ||
      lower === 'out' ||
      lower === 'debit' ||
      lower === 'ausgabe' ||
      lower === 'auszahlung'
    ) {
      return 'expense';
    }
  }

  // Check if amount is negative (indicates expense)
  if (amountStr) {
    const clean = amountStr.trim();
    if (clean.startsWith('-') || clean.startsWith('(')) {
      return 'expense';
    }
    if (clean.startsWith('+')) {
      return 'income';
    }
  }

  // Default to expense (most common)
  return 'expense';
}

/**
 * Validate and transform raw data to parsed rows
 */
export function validateAndTransformData(
  rawData: Record<string, string>[],
  mapping: ColumnMapping
): ValidationResult {
  const validRows: ParsedRow[] = [];
  const invalidRows: ParsedRow[] = [];
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const categoriesSet = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  rawData.forEach((row, index) => {
    const errors: string[] = [];

    // Parse date
    const dateValue = mapping.date ? row[mapping.date] : null;
    const parsedDate = dateValue ? parseDateToISO(dateValue) : null;
    if (!parsedDate) {
      errors.push('Invalid or missing date');
    }

    // Parse amount
    const amountValue = mapping.amount ? row[mapping.amount] : null;
    const parsedAmount = amountValue ? parseAmount(amountValue) : null;
    if (parsedAmount === null || parsedAmount <= 0) {
      errors.push('Invalid or missing amount');
    }

    // Detect type
    const typeValue = mapping.type ? row[mapping.type] : undefined;
    const type = detectType(typeValue, amountValue ?? undefined);

    // Get category
    const category = mapping.category
      ? (row[mapping.category] || '').trim() || 'Other'
      : 'Other';

    // Get note
    const note = mapping.note ? (row[mapping.note] || '').trim() : '';

    // Get account
    const account = mapping.account ? (row[mapping.account] || '').trim() : '';

    const parsedRow: ParsedRow = {
      date: parsedDate || '',
      amount: parsedAmount || 0,
      type,
      category,
      note,
      account,
      originalRow: row,
      rowNumber: index + 2, // +2 because of header row and 1-based indexing
      errors,
      isValid: errors.length === 0,
    };

    if (parsedRow.isValid) {
      validRows.push(parsedRow);

      if (type === 'income') {
        totalIncome += parsedRow.amount;
        incomeCount++;
      } else {
        totalExpenses += parsedRow.amount;
        expenseCount++;
      }

      categoriesSet.add(category);

      // Track date range
      if (!minDate || parsedRow.date < minDate) minDate = parsedRow.date;
      if (!maxDate || parsedRow.date > maxDate) maxDate = parsedRow.date;
    } else {
      invalidRows.push(parsedRow);
    }
  });

  return {
    validRows,
    invalidRows,
    totalIncome,
    totalExpenses,
    incomeCount,
    expenseCount,
    categories: Array.from(categoriesSet).sort(),
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
  };
}

/**
 * Import transactions to database
 */
export async function importTransactions(
  validRows: ParsedRow[],
  userId: string,
  householdId: string,
  accountId: string,
  existingCategories: { id: string; name: string; type: string }[]
): Promise<ImportResult> {
  const errors: string[] = [];
  const newCategoriesCreated: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  try {
    // Build category map (case-insensitive)
    const categoryMap = new Map<string, string>();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // Find categories that need to be created
    const categoriesToCreate = new Set<string>();
    validRows.forEach((row) => {
      const lowerCat = row.category.toLowerCase();
      if (!categoryMap.has(lowerCat)) {
        categoriesToCreate.add(row.category);
      }
    });

    // Create new categories
    const now = Date.now();
    const categoryCreationTxs: Parameters<typeof db.transact>[0] = [];

    for (const categoryName of categoriesToCreate) {
      const categoryId = uuidv4();
      categoryMap.set(categoryName.toLowerCase(), categoryId);
      newCategoriesCreated.push(categoryName);

      categoryCreationTxs.push(
        db.tx.categories[categoryId].update({
          householdId,
          name: categoryName,
          type: 'expense', // Default to expense
          categoryGroup: 'other',
          isShareable: false,
          isDefault: false,
          createdByUserId: userId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    // Create categories in batches
    if (categoryCreationTxs.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < categoryCreationTxs.length; i += batchSize) {
        const batch = categoryCreationTxs.slice(i, i + batchSize);
        await db.transact(batch);
      }
    }

    // Import transactions in batches
    const batchSize = 50;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      const txs: Parameters<typeof db.transact>[0] = [];

      for (const row of batch) {
        const categoryId = categoryMap.get(row.category.toLowerCase());
        if (!categoryId) {
          errors.push(`Row ${row.rowNumber}: Category not found: ${row.category}`);
          skippedCount++;
          continue;
        }

        const transactionId = uuidv4();
        txs.push(
          db.tx.transactions[transactionId].update({
            userId,
            householdId,
            accountId,
            categoryId,
            type: row.type,
            amount: row.amount,
            date: row.date,
            note: row.note || undefined,
            isShared: false,
            paidByUserId: userId,
            isRecurring: false,
            createdAt: now,
            updatedAt: now,
          })
        );

        if (row.type === 'income') {
          totalIncome += row.amount;
        } else {
          totalExpenses += row.amount;
        }
        importedCount++;
      }

      if (txs.length > 0) {
        await db.transact(txs);
      }
    }

    // Update account balance
    const accountResult = await db.queryOnce({
      accounts: { $: { where: { id: accountId } } },
    });

    const account = accountResult.data.accounts?.[0];
    if (account) {
      const balanceChange = totalIncome - totalExpenses;
      await db.transact([
        db.tx.accounts[accountId].update({
          balance: account.balance + balanceChange,
          updatedAt: Date.now(),
        }),
      ]);
    }

    return {
      success: true,
      importedCount,
      skippedCount,
      newCategoriesCreated,
      totalIncome,
      totalExpenses,
      errors,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      importedCount,
      skippedCount,
      newCategoriesCreated,
      totalIncome,
      totalExpenses,
      errors: [...errors, 'Import failed. Some transactions may have been created.'],
    };
  }
}

/**
 * Export transactions to CSV
 */
export async function exportToCSV(
  transactions: ExportTransaction[],
  filename: string = 'transactions.csv'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format data for export
    const formattedData = transactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Amount: t.type === 'income' ? t.amount : -t.amount,
      Category: t.category,
      Account: t.account,
      Note: t.note,
    }));

    const csvContent = Papa.unparse(formattedData);

    if (Platform.OS === 'web') {
      // On web, trigger download via blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    } else {
      // On native, use FileSystem and Sharing
      if (!FileSystem || !Sharing) {
        return { success: false, error: 'Export not available on this platform.' };
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transactions',
          UTI: 'public.comma-separated-values-text',
        });
      }

      return { success: true };
    }
  } catch (error) {
    console.error('Export CSV error:', error);
    return { success: false, error: 'Failed to export CSV file.' };
  }
}

/**
 * Export transactions to Excel
 */
export async function exportToExcel(
  transactions: ExportTransaction[],
  filename: string = 'transactions.xlsx'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format data for export
    const formattedData = transactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Amount: t.type === 'income' ? t.amount : -t.amount,
      Category: t.category,
      Account: t.account,
      Note: t.note,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 12 }, // Date
      { width: 10 }, // Type
      { width: 12 }, // Amount
      { width: 20 }, // Category
      { width: 20 }, // Account
      { width: 30 }, // Note
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    if (Platform.OS === 'web') {
      // On web, trigger download via blob
      const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    } else {
      // On native, use FileSystem and Sharing
      if (!FileSystem || !Sharing) {
        return { success: false, error: 'Export not available on this platform.' };
      }

      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Export Transactions',
        });
      }

      return { success: true };
    }
  } catch (error) {
    console.error('Export Excel error:', error);
    return { success: false, error: 'Failed to export Excel file.' };
  }
}

/**
 * Get transactions for export with filters
 */
export async function getTransactionsForExport(
  userId: string,
  householdId: string,
  filters: ExportFilters,
  categories: { id: string; name: string }[],
  accounts: { id: string; name: string }[]
): Promise<ExportTransaction[]> {
  try {
    const result = await db.queryOnce({
      transactions: { $: { where: { userId, householdId } } },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

    let transactions = (result.data.transactions || []) as {
      id: string;
      date: string;
      type: string;
      amount: number;
      categoryId: string;
      accountId: string;
      note?: string;
    }[];

    // Apply filters
    if (filters.dateStart) {
      transactions = transactions.filter((t) => t.date >= filters.dateStart!);
    }
    if (filters.dateEnd) {
      transactions = transactions.filter((t) => t.date <= filters.dateEnd!);
    }
    if (filters.type && filters.type !== 'all') {
      transactions = transactions.filter((t) => t.type === filters.type);
    }
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      transactions = transactions.filter((t) => filters.categoryIds!.includes(t.categoryId));
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      transactions = transactions.filter((t) => filters.accountIds!.includes(t.accountId));
    }

    // Sort by date
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    // Transform to export format
    return transactions.map((t) => ({
      date: formatDateForExport(t.date),
      type: t.type === 'income' ? 'Income' : 'Expense',
      amount: t.amount,
      category: categoryMap.get(t.categoryId) || 'Unknown',
      account: accountMap.get(t.accountId) || 'Unknown',
      note: t.note || '',
    }));
  } catch (error) {
    console.error('Get transactions for export error:', error);
    return [];
  }
}

/**
 * Format date for export (DD.MM.YYYY)
 */
function formatDateForExport(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generate CSV template for download
 */
export async function downloadTemplate(): Promise<{ success: boolean; error?: string }> {
  try {
    const templateData = [
      { Date: '01.01.2025', Amount: '45.50', Category: 'Groceries', Note: 'Weekly shopping', Type: 'Expense' },
      { Date: '02.01.2025', Amount: '12.00', Category: 'Coffee', Note: 'Starbucks', Type: 'Expense' },
      { Date: '03.01.2025', Amount: '5200.00', Category: 'Salary', Note: 'Monthly salary', Type: 'Income' },
    ];

    const csv = Papa.unparse(templateData);

    if (Platform.OS === 'web') {
      // On web, trigger download via blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'transactions_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { success: true };
    } else {
      // On native, use FileSystem and Sharing
      if (!FileSystem || !Sharing) {
        return { success: false, error: 'Download not available on this platform.' };
      }

      const fileUri = `${FileSystem.cacheDirectory}transactions_template.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Template',
          UTI: 'public.comma-separated-values-text',
        });
      }

      return { success: true };
    }
  } catch (error) {
    console.error('Download template error:', error);
    return { success: false, error: 'Failed to download template.' };
  }
}
