<?php
// APIのエンドポイントを定義
header('Content-Type: application/json');

// GETパラメータでサイトURLを受け取る
if (isset($_GET['url'])) {
    $url = $_GET['url'];

    // URLが正しい形式かチェック
    if (filter_var($url, FILTER_VALIDATE_URL)) {
        
        // --- cURL を使用した生存チェック処理 ---
        $ch = curl_init($url);
        
        // ヘッダーのみ取得する（Bodyをダウンロードしないので高速）
        curl_setopt($ch, CURLOPT_NOBODY, true);
        // リダイレクト（301/302）を自動追跡する
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        // 最大リダイレクト回数
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        // 接続タイムアウト（秒）
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        // 総実行タイムアウト（秒）
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        // SSL証明書エラーを無視する場合は有効に（必要に応じて調整）
        // curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        // 実行
        curl_exec($ch);
        
        // ステータスコードとエラー情報を取得
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_errno($ch);
        
        curl_close($ch);

        // cURLエラーがなく、HTTPステータスコードが 200以上400未満（正常・リダイレクト成功）の場合
        // もし403（Forbidden）等も「サイトは存在する」とみなすなら $http_code !== 0 && $http_code !== 404 に変更してください
        if ($curl_error === 0 && $http_code >= 200 && $http_code < 400) {
            $response = [
                'status' => 'success',
                'message' => 'The site exists.',
                'http_code' => $http_code
            ];
        } else {
            $response = [
                'status' => 'error',
                'message' => 'The site does not exist or is unreachable.',
                'http_code' => $http_code !== 0 ? $http_code : null
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
