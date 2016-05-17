using UnityEngine;
using System.Collections;

public class Fade : MonoBehaviour
{
    //Sprite that we will fade
    private SpriteRenderer sprite;
    //The rate at how fast we will fade (Default is 0.03f for bullets)
    [SerializeField] private float fadeTime = 0.03f;

    void Awake()
    {
        sprite = GetComponent<SpriteRenderer>();
    }

    void FixedUpdate()
    {
        StartFading(fadeTime);
    }

    void StartFading(float speed)
    {
        float alpha = sprite.color.a;

        if (alpha > 0)
        {
            alpha -= speed;
            sprite.color = new Color(1f, 1f, 1f, alpha);
        }
        else if (alpha < 0)
            Destroy(this.gameObject);
    }
}
