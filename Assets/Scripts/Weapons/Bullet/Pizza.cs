using UnityEngine;
using System.Collections;

public class Pizza : BaseBullet
{
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Explosion partical
    [SerializeField] private GameObject pizzaExplosion;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Pizza);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Pizza);
    }

    void FixedUpdate()
    {
        if (isRight)
            rbBullet.velocity = new Vector2(speed, rbBullet.velocity.y);
        else if (isLeft)
            rbBullet.velocity = new Vector2(-speed, rbBullet.velocity.y);
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
            else
            {
                isRight = false;
                isLeft = false;
                rbBullet.isKinematic = true;
                gameObject.AddComponent<Fade>();
            }
        }
    }
}
