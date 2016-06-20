using UnityEngine;
using System.Collections;

public class Stone : BaseBullet
{
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //The broken sprite.
    [SerializeField] private GameObject brokenBullet;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.stone);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.stone);
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
                speed = 0;
                Destroy(this.gameObject);
            }

            else
            {
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }
        }
    }
}
