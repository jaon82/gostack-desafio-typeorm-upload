// import AppError from '../errors/AppError';

import { getCustomRepository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    let categoryDatabase = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!categoryDatabase) {
      categoryDatabase = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(categoryDatabase);
    }

    const transaction = transactionRepository.create({
      category_id: categoryDatabase.id,
      title,
      type,
      value,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
