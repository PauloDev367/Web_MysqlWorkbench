<?php

declare(strict_types=1);

final class Crypto
{
    public static function encrypt(string $plainText): string
    {
        $key = hash('sha256', self::appKey(), true);
        $iv = random_bytes(16);
        $cipher = openssl_encrypt($plainText, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        if ($cipher === false) {
            throw new RuntimeException('Falha ao criptografar credencial.');
        }

        return base64_encode($iv . $cipher);
    }

    public static function decrypt(string $encodedCipher): string
    {
        $raw = base64_decode($encodedCipher, true);
        if ($raw === false || strlen($raw) < 17) {
            throw new RuntimeException('Payload criptografado inválido.');
        }

        $key = hash('sha256', self::appKey(), true);
        $iv = substr($raw, 0, 16);
        $cipher = substr($raw, 16);
        $plain = openssl_decrypt($cipher, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);

        if ($plain === false) {
            throw new RuntimeException('Falha ao descriptografar credencial.');
        }

        return $plain;
    }

    private static function appKey(): string
    {
        $envKey = getenv('APP_KEY');
        if (is_string($envKey) && trim($envKey) !== '') {
            return $envKey;
        }

        return 'change-this-default-app-key';
    }
}
