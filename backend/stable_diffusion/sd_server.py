import torch
from diffusers import StableDiffusionPipeline
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import io
from PIL import Image
import uvicorn
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Stable Diffusion Server", version="1.0.0")

# Глобальная переменная для пайплайна
pipeline = None


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 20
    cfg_scale: float = 7.0
    sampler_name: str = "DPM++ 2M Karras"
    seed: int = -1
    batch_size: int = 1
    n_iter: int = 1


@app.on_event("startup")
async def startup_event():
    """Инициализация модели при запуске"""
    global pipeline

    try:
        logger.info("Loading Stable Diffusion model...")

        # Проверяем доступность CUDA
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")

        # Загружаем модель
        model_id = "runwayml/stable-diffusion-v1-5"
        pipeline = StableDiffusionPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            safety_checker=None,  # Отключаем safety checker для D&D контента
            requires_safety_checker=False
        )

        pipeline = pipeline.to(device)

        # Включаем оптимизации для экономии памяти
        if device == "cuda":
            pipeline.enable_attention_slicing()
            pipeline.enable_xformers_memory_efficient_attention()

        logger.info("Stable Diffusion model loaded successfully!")

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    global pipeline

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    return {"status": "healthy", "model_loaded": True}


@app.post("/generate")
async def generate_image(request: GenerateRequest):
    """Генерация изображения"""
    global pipeline

    if pipeline is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        logger.info(f"Generating image with prompt: {request.prompt[:100]}...")

        # Параметры генерации
        generator = None
        if request.seed != -1:
            generator = torch.Generator(device=pipeline.device).manual_seed(request.seed)

        # Генерируем изображение
        with torch.no_grad():
            result = pipeline(
                prompt=request.prompt,
                negative_prompt=request.negative_prompt,
                width=request.width,
                height=request.height,
                num_inference_steps=request.steps,
                guidance_scale=request.cfg_scale,
                generator=generator,
                num_images_per_prompt=request.batch_size,
            )

        # Конвертируем в base64
        images_base64 = []
        for image in result.images:
            # Конвертируем PIL Image в base64
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()
            images_base64.append(img_str)

        logger.info("Image generation completed successfully")

        return {
            "images": images_base64,
            "parameters": {
                "prompt": request.prompt,
                "negative_prompt": request.negative_prompt,
                "width": request.width,
                "height": request.height,
                "steps": request.steps,
                "cfg_scale": request.cfg_scale,
                "seed": request.seed
            }
        }

    except Exception as e:
        logger.error(f"Error generating image: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/models")
async def get_models():
    """Получить список доступных моделей"""
    return {
        "models": [
            {
                "name": "stable-diffusion-v1-5",
                "type": "text-to-image",
                "loaded": pipeline is not None
            }
        ]
    }


@app.get("/")
async def root():
    """Корневой endpoint"""
    return {
        "message": "Stable Diffusion Server for D&D Game",
        "version": "1.0.0",
        "status": "running",
        "model_loaded": pipeline is not None
    }


if __name__ == "__main__":
    uvicorn.run(
        "sd_server:app",
        host="0.0.0.0",
        port=7860,
        log_level="info"
    )