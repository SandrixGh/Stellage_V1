import { useState, useEffect } from "react";
import { FlipIcon, CheckIcon, CloseIcon, LayersIcon } from "../UI/Icons";
import "./FlashcardDeckSlot.css";

interface Flashcard {
    id: string;
    front: string;
    back: string;
}

interface FlashcardDeckSlotProps {
    boxId: string;
    cards?: Flashcard[];
}

const DEFAULT_CARDS: Flashcard[] = [
    {
        id: "c1",
        front: "Какова формула уравнения движения гармонического маятника?",
        back: "d²θ/dt² + (g/L)·sin(θ) = 0",
    },
    {
        id: "c2",
        front: "Как в Python вычисляется дифференциальное уравнение методом Эйлера?",
        back: "theta_next = theta + omega * dt\nomega_next = omega + d2theta * dt",
    },
    {
        id: "c3",
        front: "Что такое фазовое пространство системы?",
        back: "Пространство всех возможных состояний системы (координата θ и скорость ω).",
    },
];

export const FlashcardDeckSlot = ({ boxId, cards = DEFAULT_CARDS }: FlashcardDeckSlotProps) => {
    const storageKey = `stellage-study-flashcards-${boxId}`;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    // Track mastered cards in state and localStorage
    const [masteredIds, setMasteredIds] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(masteredIds));
        } catch {
            // ignore
        }
    }, [masteredIds, storageKey]);

    const card = cards[currentIndex] || cards[0];
    const isMastered = masteredIds.includes(card.id);
    const progressPct = Math.round((masteredIds.length / cards.length) * 100);

    const handleFlip = () => {
        setIsFlipped((prev) => !prev);
    };

    const handleRating = (mastered: boolean) => {
        if (mastered) {
            if (!masteredIds.includes(card.id)) {
                setMasteredIds((prev) => [...prev, card.id]);
            }
        } else {
            setMasteredIds((prev) => prev.filter((id) => id !== card.id));
        }
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    return (
        <div className="flashcard-deck-container">
            {/* Header */}
            <div className="flashcard-deck-header">
                <div className="flashcard-deck-title">
                    <LayersIcon size={16} />
                    <span>Active Recall Flashcards ({currentIndex + 1} / {cards.length})</span>
                </div>
                <div className="flashcard-deck-progress">
                    <div className="flashcard-progress-bar">
                        <div className="flashcard-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="flashcard-progress-text">{progressPct}% Освоено</span>
                </div>
            </div>

            {/* 3D Flip Card */}
            <div className="flashcard-perspective" onClick={handleFlip}>
                <div className={`flashcard-3d-card ${isFlipped ? "is-flipped" : ""}`}>
                    {/* Front side */}
                    <div className="flashcard-face flashcard-front">
                        <div className="flashcard-side-tag">Вопрос / Термин</div>
                        <p className="flashcard-text">{card.front}</p>
                        <div className="flashcard-hint">
                            <FlipIcon size={14} />
                            <span>Кликните для переворота</span>
                        </div>
                    </div>

                    {/* Back side */}
                    <div className="flashcard-face flashcard-back">
                        <div className="flashcard-side-tag answer">Ответ / Пояснение</div>
                        <p className="flashcard-text">{card.back}</p>
                        <div className="flashcard-hint">
                            <FlipIcon size={14} />
                            <span>Перевернуть обратно</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flashcard-actions">
                <button
                    type="button"
                    className="flashcard-btn danger"
                    onClick={() => handleRating(false)}
                >
                    <CloseIcon size={14} />
                    <span>Повторить позже</span>
                </button>

                <button
                    type="button"
                    className="flashcard-btn flip"
                    onClick={handleFlip}
                >
                    <FlipIcon size={14} />
                    <span>Перевернуть</span>
                </button>

                <button
                    type="button"
                    className={`flashcard-btn success ${isMastered ? "active" : ""}`}
                    onClick={() => handleRating(true)}
                >
                    <CheckIcon size={14} />
                    <span>Освоено!</span>
                </button>
            </div>
        </div>
    );
};
