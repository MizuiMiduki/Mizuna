<?php
if (isset($_GET['url']) && !empty($_GET['url'])) {
    $imageUrl = $_GET['url'];

    // URLの形式検証とHTTPSチェック
    if (filter_var($imageUrl, FILTER_VALIDATE_URL) && parse_url($imageUrl, PHP_URL_SCHEME) === 'https') {
        $headers = @get_headers($imageUrl, 1);

        // ファイルサイズ制限: 5MB
        if ($headers && isset($headers['Content-Length']) && $headers['Content-Length'] < 5000000) {
            $imageData = @file_get_contents($imageUrl);

            if ($imageData !== false) {
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mimeType = $finfo->buffer($imageData);

                // サポートするMIMEタイプにwebpを追加
                if (in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
                    header('Content-Type: ' . $mimeType);
                    echo $imageData;
                    exit;
                } else {
                    header("HTTP/1.1 400 Bad Request");
                    echo "Unsupported image type.";
                    exit;
                }
            }
        }
        header("HTTP/1.1 500 Internal Server Error");
        echo "Failed to fetch the image or the file is too large.";
    } else {
        header("HTTP/1.1 400 Bad Request");
        echo "Invalid or non-HTTPS image URL.";
    }
} else {
    header("HTTP/1.1 400 Bad Request");
    echo "Image URL parameter is missing. Please provide a valid URL using ?url= parameter.";
}
