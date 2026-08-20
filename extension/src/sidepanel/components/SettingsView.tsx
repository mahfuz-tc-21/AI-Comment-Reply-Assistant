import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Trash2 } from 'lucide-react';
import { BrandSettings } from '../../shared/types';
import { DEFAULT_BRAND_SETTINGS, DEFAULT_SERVER_URL } from '../../shared/constants';

interface SettingsViewProps {
  onClose: () => void;
  onSave: (settings: BrandSettings, geminiApiKey: string) => void;
  currentSettings: BrandSettings;
  currentGeminiApiKey: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onClose,
  onSave,
  currentSettings,
  currentGeminiApiKey
}) => {
  const [settings, setSettings] = useState<BrandSettings>(currentSettings);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(currentGeminiApiKey);
  const [wordsToAvoidStr, setWordsToAvoidStr] = useState<string>('');
  const [preferredPhrasesStr, setPreferredPhrasesStr] = useState<string>('');

  useEffect(() => {
    setWordsToAvoidStr(settings.wordsToAvoid.join(', '));
    setPreferredPhrasesStr(settings.preferredPhrases.join(', '));
  }, [settings]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    const updatedWords = wordsToAvoidStr
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    
    const updatedPhrases = preferredPhrasesStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const finalSettings: BrandSettings = {
      ...settings,
      wordsToAvoid: updatedWords,
      preferredPhrases: updatedPhrases
    };

    onSave(finalSettings, geminiApiKey);
    onClose();
  };

  const handleResetDefaults = () => {
    if (confirm('Reset settings to Programming Hero defaults?')) {
      setSettings(DEFAULT_BRAND_SETTINGS);
      setGeminiApiKey('');
    }
  };

  const handleClearData = () => {
    if (confirm('Clear all locally cached comment history and settings?')) {
      chrome.storage.local.clear(() => {
        alert('Local data cleared successfully.');
        window.location.reload();
      });
    }
  };

  return (
    <div className="bg-[#0f0a1e] p-4 h-[calc(100vh-60px)] overflow-y-auto space-y-4">
      <div className="flex items-center justify-between border-b border-[#221c3b] pb-2">
        <h2 className="font-bold text-sm text-white">Brand & AI Settings</h2>
        <button
          onClick={onClose}
          className="text-xs text-[#84809e] hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Gemini API Key */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Gemini API Key</label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500"
            placeholder="Enter your API Key (AIzaSy...)"
          />
        </div>

        {/* Brand Name */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Brand Name</label>
          <input
            type="text"
            name="brandName"
            value={settings.brandName}
            onChange={handleTextChange}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500"
          />
        </div>

        {/* Brand Tone */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Response Tone</label>
          <input
            type="text"
            name="brandTone"
            value={settings.brandTone}
            onChange={handleTextChange}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500"
          />
        </div>

        {/* Reply Style Selects */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[#84809e] mb-1 font-medium">Reply Length</label>
            <select
              name="replyLength"
              value={settings.replyLength}
              onChange={handleSelectChange}
              className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500"
            >
              <option value="short">Short (1-3 sentences)</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          <div>
            <label className="block text-[#84809e] mb-1 font-medium">Emoji Usage</label>
            <select
              name="emojiUsage"
              value={settings.emojiUsage}
              onChange={handleSelectChange}
              className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500"
            >
              <option value="none">None</option>
              <option value="minimal">Minimal (Natural)</option>
              <option value="frequent">Frequent</option>
            </select>
          </div>
        </div>

        {/* Words to Avoid */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Words/Phrases to Avoid (comma separated)</label>
          <textarea
            value={wordsToAvoidStr}
            onChange={(e) => setWordsToAvoidStr(e.target.value)}
            rows={2}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500 resize-none"
            placeholder="robotic phrases, canned greetings..."
          />
        </div>

        {/* Preferred Phrases */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Preferred Phrases (comma separated)</label>
          <textarea
            value={preferredPhrasesStr}
            onChange={(e) => setPreferredPhrasesStr(e.target.value)}
            rows={2}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500 resize-none"
            placeholder="vai, apu, try koro..."
          />
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-[#84809e] mb-1 font-medium">Custom Prompt Instructions</label>
          <textarea
            name="customInstructions"
            value={settings.customInstructions}
            onChange={handleTextChange}
            rows={3}
            className="w-full bg-[#161224] border border-[#2d274e] rounded p-2 text-white outline-none focus:border-brand-500 resize-none"
          />
        </div>

        {/* Actions list */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded bg-brand-600 hover:bg-brand-500 text-white font-semibold transition"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleResetDefaults}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded border border-[#2d274e] hover:bg-[#161224] text-[#84809e] hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={handleClearData}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded border border-rose-950/40 hover:bg-rose-950/20 text-rose-400/80 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Storage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
