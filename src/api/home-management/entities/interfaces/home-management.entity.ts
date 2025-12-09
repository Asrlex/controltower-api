import {
  CarTaskTypes,
  ShiftTypes,
  AbsenceTypes,
} from '@/api/entities/enums/dto.enum';

export interface StockProductI {
  stockProductID: number;
  stockProductAmount: number;
  product: ProductI;
}

export interface ShoppingListProductI {
  shoppingListProductID: number;
  shoppingListProductAmount: number;
  product: ProductI;
  shop: ShopI;
}

export interface ProductI {
  productID: number;
  productName: string;
  productUnit: string;
  productDateLastConsumed: string;
  productDateLastBought: string;
  tags: TagI[];
}

export interface ShopI {
  shopID: number;
  shopName: string;
}

export interface TagI {
  tagID: number;
  tagName: string;
  tagType: string;
}

export interface TaskI {
  taskID: number;
  taskTitle: string;
  taskDescription: string;
  taskCompleted: boolean;
  taskCompletedAt: string;
  taskDateCreated: string;
  taskDateModified: string;
  tags: TagI[];
}

export interface HouseTaskI {
  houseTaskID: number;
  houseTaskName: string;
  houseTaskDate: string;
}

export interface CarTaskI {
  carTaskID: number;
  carTaskName: CarTaskTypes;
  carTaskDetails: string;
  carTaskCost: number;
  carTaskDate: string;
}

export interface RecipeDetailI {
  recipeID: number;
  recipeName: string;
  recipeDescription: string;
  tags: TagI[];
}

export interface RecipeNameI {
  recipeID: number;
  recipeName: string;
  tags: TagI[];
}

export interface RecipeDetailI {
  recipeID: number;
  recipeName: string;
  recipeDescription: string;
  tags: TagI[];
  steps: RecipeStepI[];
  ingredients: RecipeIngredientI[];
}

export interface RecipeStepI {
  recipeStepID: number;
  recipeStepName: string;
  recipeStepDescription: string;
  recipeStepOrder: number;
  recipeStepIsOptional: boolean;
}

export interface RecipeIngredientI {
  recipeIngredientID: number;
  recipeIngredientAmount: number;
  recipeIngredientUnit: string;
  recipeIngredientIsOptional: boolean;
  product: ProductI;
}

export interface SettingsI {
  settingsID: number;
  settings: string;
  settingsUserID: number;
  settingsDateCreated: string;
  settingsLastModified: string;
}

export interface UserI {
  userID: number;
  userName: string;
  userEmail: string;
  userPassword: string;
  userDateCreated: string;
  userLastModified: string;
  userLastLogin: string;
}

export interface LoggedUserI {
  user: UserI;
  token: string;
}

export interface ExpenseI {
  expenseID: number;
  expenseAmount: number;
  expenseDate: string;
  expenseDescription: string;
  categoryID: number;
  categoryName: string;
}

export interface ExpenseCategoryI {
  categoryID: number;
  categoryName: string;
}

export interface ShiftI {
  shiftID: number;
  shiftTime: number;
  shiftDate: string;
  shiftCheckins: ShiftCheckinI[];
}

export interface ShiftCheckinI {
  shiftCheckinID: number;
  shiftCheckinDate: string;
  shiftCheckinTimestamp: string;
  shiftCheckinType: ShiftTypes;
}

export interface AbsenceI {
  absenceID: number;
  absenceDate: string;
  absenceType: AbsenceTypes;
  absenceComment: string;
  absenceHours: number;
}
