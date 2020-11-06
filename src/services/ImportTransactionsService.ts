import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import uploadConfig from '../config/upload';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface ImportedTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(importFileName: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const csvFilePath = path.join(uploadConfig.directory, importFileName);

    const importedTransactions = await this.loadCSV(csvFilePath);

    const importedCategories = Array.from(
      new Set(importedTransactions.map(transaction => transaction.category)),
    );
    const databaseCategories = await categoriesRepository.find({
      where: {
        title: In(importedCategories),
      },
    });
    const databaseCategoriesTitles = databaseCategories.map(
      category => category.title,
    );
    const newCategories = importedCategories.filter(
      category => !databaseCategoriesTitles.includes(category),
    );
    const newDatabaseCategories = categoriesRepository.create(
      newCategories.map(category => ({
        title: category,
      })),
    );
    await categoriesRepository.save(newDatabaseCategories);

    const categories = [...databaseCategories, ...newDatabaseCategories];

    const transactions = transactionsRepository.create(
      importedTransactions.map(transaction => ({
        category: categories.find(
          category => category.title === transaction.category,
        ),
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
      })),
    );
    await transactionsRepository.save(transactions);

    await fs.promises.unlink(csvFilePath);

    return transactions;
  }

  async loadCSV(csvFilePath: string): Promise<ImportedTransaction[]> {
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parseStream);

    const importedTransactions: ImportedTransaction[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      importedTransactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return importedTransactions;
  }
}

export default ImportTransactionsService;
