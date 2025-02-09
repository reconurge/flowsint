"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from 'lucide-react'

export default function DisplaySelector({ values }: { values: string[] }) {
    const [selected, setSelected] = useState<string[]>([])

    const toggleSelect = (val: string) => {
        setSelected((prev) =>
            prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
        )
    }

    return (
        <div className="">
            <motion.div
                className="flex flex-wrap gap-1 overflow-visible"
                layout
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 0.5,
                }}
            >
                {values.map((value: string, i: number) => {
                    const isSelected = selected.includes(value)
                    return (
                        <motion.button
                            key={i}
                            onClick={() => toggleSelect(value)}
                            layout
                            initial={false}
                            animate={{
                                backgroundColor: isSelected ? "#2a1711" : "rgba(39, 39, 42, 0.07)",
                            }}
                            whileHover={{
                                backgroundColor: isSelected ? "#2a1711" : "rgba(39, 39, 42, 0.07)",
                            }}
                            whileTap={{
                                backgroundColor: isSelected ? "#1f1209" : "rgba(39, 39, 42, 0.07)",
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 0.5,
                                backgroundColor: { duration: 0.1 },
                            }}
                            className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  whitespace-nowrap overflow-hidden ring-1 ring-inset
                  ${isSelected
                                    ? "text-[#ff9066] ring-[hsla(0, 0.00%, 100.00%, 0.32)]"
                                    : "text-zinc-400 ring-[hsla(0, 0.00%, 100.00%, 0.33)]"}
                `}
                        >
                            <motion.div
                                className="relative flex items-center"
                                animate={{
                                    width: isSelected ? "auto" : "100%",
                                    paddingRight: isSelected ? "1rem" : "0",
                                }}
                                transition={{
                                    ease: [0.175, 0.885, 0.32, 1.275],
                                    duration: 0.3,
                                }}
                            >
                                <span>{value}</span>
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.span
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 30,
                                                mass: 0.5
                                            }}
                                            className="absolute right-0"
                                        >
                                            <div className="w-3 h-3 rounded-full bg-[#ff9066] flex items-center justify-center">
                                                <Check className="w-2 h-2 text-[#2a1711]" strokeWidth={1.5} />
                                            </div>
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </motion.button>
                    )
                })}
            </motion.div>
        </div>
    )
}

