
# 🍔 YumYumDev

Fullstack мобильное приложение для заказа еды.

Проект состоит из двух частей:
```
- 📱 **YumYum-app** — мобильное приложение (React Native + Expo)
- 🖥 **YumYum-server** — серверная часть (Node.js + Express)
```
Проект разрабатывается в рамках ВКР и демонстрирует полноценную архитектуру клиент–серверного приложения.

# 🚀 Технологии

## Frontend (YumYum-app)
```
- React Native
- Expo
- JavaScript
- React Navigation
- Axios
```
## Backend (YumYum-server)
```
- Node.js
- Express.js
- MongoDB (если используется)
- Mongoose (если используется)
- dotenv
```
# 📂 Структура проекта
```
YumYumDev
├── YumYum-app      # Мобильное приложение
├── YumYum-server   # Серверная часть
└── README.md
```

# 📥 Как скачать проект
```
git clone https://github.com/USERNAME/YumYumDev.git
cd YumYumDev
```

# ⚙ Установка зависимостей

## Установка frontend

```bash
cd YumYum-app
npm install
```

## Установка backend

```bash
cd ../YumYum-server
npm install
```

---

# ▶ Запуск проекта

## 🔹 Запуск сервера
Перейти в папку сервера:

```bash
cd YumYum-server
npm start
```
или (если используется nodemon):
```bash
npm run dev
```
## 🔹 Запуск мобильного приложения

Перейти в папку приложения:

```bash
cd YumYum-app
npx expo start
```
# 🔐 Переменные окружения

Если используется файл `.env`, необходимо создать его вручную в папке сервера:
Пример:
```
PORT=5000
MONGO_URI=your_database_url
```

# 📌 Требования

* Node.js 18+
* npm или yarn
* Expo CLI
* MongoDB (если используется локально)

---

# 👨‍💻 Автор

Разработчик: Egor
Проект разработан в учебных целях (ВКР).

---

