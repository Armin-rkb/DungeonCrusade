using UnityEngine;
using System.Collections;

public class Pill : BaseBullet
{
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;

    //How long the bullet will stay
    private float lifeTime = 150f;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.pill);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.pill);
    }

    void FixedUpdate()
    {
        lifeTime--;

        if (isRight)
        {
            rbBullet.AddForce(Vector2.right * speed, ForceMode2D.Impulse);
            isRight = false;
        }

        else if (isLeft)
        {
            rbBullet.AddForce(-Vector2.right * speed, ForceMode2D.Impulse);
            isLeft = false;
        }

        if (bounce)
        {
            rbBullet.velocity = new Vector2(rbBullet.velocity.x, speed + speed);
            bounce = false;
        }

        if (lifeTime < 0)
            gameObject.AddComponent<Fade>();
    }


    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.CompareTag(GameTags.ground))
                bounce = true;

            else if (!coll.gameObject.CompareTag(GameTags.ground))
                gameObject.AddComponent<Fade>();
        }
    }
}