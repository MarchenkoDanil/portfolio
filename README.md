# Портфолио: 7 сайтов для бизнеса и Telegram-бот

**Живые сайты:** https://marchenkodanil.github.io/portfolio/

Одностраничные продающие сайты для разных ниш. У каждого своя аудитория, визуальная концепция и продающая структура: сильный первый экран, преимущества, подтверждение доверия, примеры работ или услуг, заметная форма заявки. Все сайты адаптированы под телефоны.

| | Сайт | Ниша | Особенности |
|---|---|---|---|
| <img src="assets/previews/01-coffee-roastery.jpg" width="260"> | [**Тёплый край**](https://marchenkodanil.github.io/portfolio/01-coffee-roastery/) | Обжарка кофе | Каталог со шкалами вкуса, выбор подписки, раздел для оптовых клиентов |
| <img src="assets/previews/02-interior-studio.jpg" width="260"> | [**ОБЪЁМ**](https://marchenkodanil.github.io/portfolio/02-interior-studio/) | Бюро интерьеров | Журнальная вёрстка, меню на весь экран, слайдер отзывов |
| <img src="assets/previews/03-law-firm.jpg" width="260"> | [**Корнилов и партнёры**](https://marchenkodanil.github.io/portfolio/03-law-firm/) | Юридическая фирма | Анимированные счётчики, раскрывающиеся ответы на вопросы, отправка заявок в Telegram |
| <img src="assets/previews/04-fitness-studio.jpg" width="260"> | [**PULSE LAB**](https://marchenkodanil.github.io/portfolio/04-fitness-studio/) | Фитнес-студия | Расписание по дням, бегущая строка, тарифы |
| <img src="assets/previews/05-kids-english-school.jpg" width="260"> | [**Owl School**](https://marchenkodanil.github.io/portfolio/05-kids-english-school/) | Детская школа английского | Сова из CSS следит за курсором, запись по возрасту |
| <img src="assets/previews/06-dental-clinic.jpg" width="260"> | [**Дента Плюс**](https://marchenkodanil.github.io/portfolio/06-dental-clinic/) | Стоматология | Прайс по вкладкам, слайдер «до/после», маска телефона |
| <img src="assets/previews/07-renovation-company.jpg" width="260"> | [**Ремонт по смете**](https://marchenkodanil.github.io/portfolio/07-renovation-company/) | Ремонт квартир | Калькулятор стоимости, результат которого попадает в заявку |

## Технологии

- Чистые HTML, CSS и JavaScript: без фреймворков и сборки, каждый сайт открывается сам по себе.
- Все иллюстрации нарисованы на CSS и SVG, сторонних картинок нет.
- Адаптивная вёрстка для компьютеров, планшетов и телефонов, мобильное меню, учёт настройки `prefers-reduced-motion`.
- Валидация форм, скрытое поле-ловушка от спам-ботов.

## Telegram-бот для заявок — [`telegram-bot/`](telegram-bot/)

**[Попробовать демо бота в браузере →](https://marchenkodanil.github.io/portfolio/telegram-bot/)**

<img src="telegram-bot/screenshots/lead.jpg" width="200"> <img src="telegram-bot/screenshots/leads.jpg" width="200"> <img src="telegram-bot/screenshots/stats.jpg" width="200">

Node.js без внешних зависимостей. Принимает заявки с сайта по HTTP и даёт работать с ними в Telegram:

- уведомление о новой заявке с кнопками статуса: «В работе», «Закрыта», «Отказ»;
- `/leads` — список заявок с постраничным просмотром и фильтрами, `/new` — необработанные;
- поиск по имени, телефону и тексту, заметки к заявкам;
- `/stats` — статистика, конверсия, время реакции, график за 7 дней;
- `/export` — выгрузка в CSV для Excel;
- напоминания о необработанных заявках, доступ только для администраторов.

Запуск: скопируйте `config.example.json` в `config.json`, укажите токен и свой chat id, затем выполните `node bot.js`.

> На витрине формы работают в демо-режиме. Компании, люди и контакты вымышлены.
