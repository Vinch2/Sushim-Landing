<?php
// ========== НАСТРОЙКИ TELEGRAM ==========
$token = '7953098750:AAFpG6nF20FQ5MNCseqes3Xs7ybbZZwQd3Q';
$chat_id = '129689082';
// ========================================

// Получаем данные из POST-запроса
$name = $_POST['name'] ?? '';
$phone = $_POST['phone'] ?? '';
$area = $_POST['area'] ?? '';
$days = $_POST['days'] ?? '';
$household = $_POST['household'] ?? '';
$semipro = $_POST['semipro'] ?? '';
$daily_price = $_POST['daily_price'] ?? '';
$total = $_POST['total'] ?? '';

// Формируем сообщение
$message = "Новая заявка с сайта СУШИМ\n";
$message .= "Имя: $name\n";
$message .= "Телефон: $phone\n\n";
$message .= "--- Детали заказа ---\n";
$message .= "Площадь: $area\n";
$message .= "Количество дней: $days\n";
$message .= "Бытовые осушители: $household\n";
$message .= "Полупромышленные: $semipro\n";
$message .= "Цена за сутки (всего): $daily_price\n";
$message .= "Итоговая сумма: $total";

// Отправляем в Telegram
$url = "https://api.telegram.org/bot$token/sendMessage";
$data = [
    'chat_id' => $chat_id,
    'text' => $message,
    'parse_mode' => 'HTML'
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data)
    ]
];
$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result !== false) {
    echo 'ok';
} else {
    echo 'error';
}
?>