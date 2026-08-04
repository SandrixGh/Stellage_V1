import enum


class CurrencyEnum(str, enum.Enum):
    STELLA = "stella"  # Стеллакоины Stellage
    USD = "usd"  # Доллар США
    RUB = "rub"  # Российский рубль
    EUR = "eur"  # Евро
    GBP = "gbp"  # Британский фунт стерлингов
    CNY = "cny"  # Китайский юань
    JPY = "jpy"  # Японская иена
    KZT = "kzt"  # Казахский тенге (часто актуален для СНГ)
    BYN = "byn"  # Белорусский рубль
    TRY = "try"  # Турецкая лира