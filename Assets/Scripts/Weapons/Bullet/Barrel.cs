using UnityEngine;
using System.Collections;

public class Barrel : BaseBullet
{
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //The broken sprite.
    [SerializeField] private GameObject brokenBullet;
    //How long the bullet will stay
    private float lifeTime = 150f;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Barrel);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Barrel);
    }

    void FixedUpdate()
    {
        lifeTime--;

        if (isRight)
            rbBullet.velocity = new Vector2(speed, rbBullet.velocity.y);
        else if (isLeft)
            rbBullet.velocity = new Vector2(-speed, rbBullet.velocity.y);

        if (lifeTime < 0)
        {
            Instantiate(brokenBullet, transform.position, transform.rotation);
            Destroy(this.gameObject);
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                Hit(coll.gameObject);
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }

            else if (!coll.gameObject.CompareTag(GameTags.ground))
            {
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }
        }
    }
}
