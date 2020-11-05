import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

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
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();
      if (value > balance.total) {
        throw new AppError('Valor acima do limite permitido.', 400);
      }
    }

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

    const transaction = transactionsRepository.create({
      category_id: categoryDatabase.id,
      title,
      type,
      value,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
