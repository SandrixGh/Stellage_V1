import type { Box } from "../../types/Stellage/boxes";
import "./BoxCard.css";

export const BoxCard = ({ box }: { box: Box }) => {
    return (
        <div className={`box-card rarity-${box.template.rarity.toLowerCase()}`}>
            <div className="box-header">
                <span className="serial">#{box.serial_number}</span>
                {box.is_verified === 'verified' && <span className="verified">✓</span>}
            </div>
            
            <div className="box-body">
                <div className="box-icon">📦</div>
                <h3 className="box-title">{box.template.title}</h3>
            </div>

            <div className="box-footer">
                <span className={`status ${box.is_sealed}`}>
                    {box.is_sealed === 'sealed' ? "Запечатана" : "Открыта"}
                </span>
            </div>
        </div>
    );
};