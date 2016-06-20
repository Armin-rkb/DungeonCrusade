using UnityEngine;
using System.Collections;

public class Hadouken : BaseBullet
{
    //The broken sprite.
    [SerializeField] private GameObject brokenBullet;
    private bool isRight;
    private bool isLeft;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        SoundManager.PlayAudioClip(AudioData.Hadouken);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Hadouken);
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
                Instantiate(brokenBullet, transform.position, transform.rotation);
                Destroy(this.gameObject);
            }
            else
            {
                Instantiate(brokenBullet, new Vector2(transform.position.x * 1.075f, transform.position.y), transform.rotation);
                Destroy(this.gameObject);
            }
        }
    }
}
