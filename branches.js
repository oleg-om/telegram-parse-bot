import axios from "axios";
import { config } from "dotenv";
import { executeWithAuth, getCookiesForRequest } from "./helpers.js";
import fs from "node:fs";
import path from "node:path";

config();

// Текущая выбранная ветка (по умолчанию 720)
let currentBranch = 720;

// Получить список всех доступных веток
export const getBranchesRequest = async () => {
  const requestConfig = await getCookiesForRequest();
  const response = await axios.get(process.env.BRANCH_URL, requestConfig);
  return response.data || [];
};

export const getBranches = async (bot) => {
  return await executeWithAuth(
    getBranchesRequest,
    bot,
    null, // tickets
    null, // onSuccess callback
  );
};

// Получить текущую выбранную ветку
export const getCurrentBranch = () => {
  return currentBranch;
};

// Установить новую ветку
export const setCurrentBranch = (branchId) => {
  currentBranch = branchId;
  return currentBranch;
};

// Получить информацию о текущей ветке

export const getCurrentBranchInfo = async (bot) => {
  console.log("getCurrentBranchInfo");
  try {
    const branches = await getBranches(bot);
    if (branches && Array.isArray(branches)) {
      const currentBranchData = branches.find(
        (branch) => branch.id === currentBranch,
      );
      return (
        currentBranchData || { id: currentBranch, name: "Неизвестная ветка" }
      );
    } else {
      return { id: currentBranch, name: "Неизвестная ветка" };
    }
  } catch (error) {
    console.error("Ошибка при получении информации о ветке:", error);
    return { id: currentBranch, name: "Неизвестная ветка" };
  }
};

// Генерировать файл со списком веток
export const generateBranchesFile = async (bot) => {
  try {
    const branches = await getBranches(bot);
    
    if (!branches || branches.length === 0) {
      throw new Error("Не удалось загрузить список веток");
    }

    // Создаем временный файл
    const fileName = `branches_${Date.now()}.txt`;
    const filePath = path.join(process.cwd(), fileName);
    
    // Формируем содержимое файла
    let content = `Список доступных веток (всего: ${branches.length})\n`;
    content += `Текущая выбранная ветка: ${currentBranch}\n\n`;
    
    branches.forEach((branch, index) => {
      const isCurrent = branch.id === currentBranch ? " [ТЕКУЩАЯ]" : "";
      content += `${index + 1}. ${branch.name} (ID: ${branch.id})${isCurrent}\n`;
    });
    
    // Записываем в файл
    fs.writeFileSync(filePath, content, 'utf8');
    
    return { filePath, fileName };
  } catch (error) {
    console.error("Ошибка при генерации файла веток:", error);
    throw error;
  }
};

// Удалить временный файл веток
export const cleanupBranchesFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Ошибка при удалении файла веток:", error);
  }
};
