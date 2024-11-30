<?php
// APIのエンドポイントを定義
header('Content-Type: application/json');

// GETパラメータでサイトURLを受け取る
if (isset($_GET['url'])) {
    $url = $_GET['url'];

    // URLが正しい形式かチェック
    if (filter_var($url, FILTER_VALIDATE_URL)) {
        // ヘッダーを取得してサイトが存在するか確認
        $headers = @get_headers($url);

        // get_headers()が失敗する場合に対処
        if ($headers && strpos($headers[0], '200') !== false) {
            $response = [
                'status' => 'success',
                'message' => 'The site exists.',
            ];
        } else {
            $response = [
                'status' => 'error',
                'message' => 'The site does not exist.',
            ];
        }
    } else {
        $response = [
            'status' => 'error',
            'message' => 'Invalid URL.',
        ];
    }
} else {
    $response = [
        'status' => 'error',
        'message' => 'No URL specified.',
    ];
}

// 結果をJSON形式で返す
echo json_encode($response);
